package com.sweetdreams.bedtimestories;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "NativeTts")
public class NativeTtsPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech textToSpeech;
    private boolean ready = false;
    private PluginCall pendingSpeakCall;
    private String activeUtterancePrefix = "";
    private String activeFinalUtteranceId = "";

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(getContext().getApplicationContext(), this);
    }

    @Override
    public void onInit(int status) {
        ready = status == TextToSpeech.SUCCESS;

        if (ready && textToSpeech != null) {
            textToSpeech.setLanguage(Locale.US);
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    notifyListeners("started", new JSObject());
                }

                @Override
                public void onDone(String utteranceId) {
                    if (utteranceId != null && utteranceId.equals(activeFinalUtteranceId)) {
                        notifyListeners("finished", new JSObject());
                    }
                }

                @Override
                public void onError(String utteranceId) {
                    notifyError(utteranceId, 0);
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    notifyError(utteranceId, errorCode);
                }
            });
        }

        if (pendingSpeakCall != null) {
            PluginCall call = pendingSpeakCall;
            pendingSpeakCall = null;
            if (ready) {
                speakNow(call);
            } else {
                call.reject("Android text-to-speech is not available.");
            }
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", canSpeakEnglish());
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("No story text provided.");
            return;
        }

        if (textToSpeech == null) {
            pendingSpeakCall = call;
            textToSpeech = new TextToSpeech(getContext().getApplicationContext(), this);
            return;
        }

        if (!ready) {
            pendingSpeakCall = call;
            return;
        }

        speakNow(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        pendingSpeakCall = null;
        activeUtterancePrefix = "";
        activeFinalUtteranceId = "";
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        call.resolve();
    }

    private void speakNow(PluginCall call) {
        if (textToSpeech == null || !ready) {
            call.reject("Android text-to-speech is not available.");
            return;
        }

        String text = call.getString("text", "").trim();
        float rate = safeFloat(call.getDouble("rate"), 0.82f, 0.5f, 1.5f);
        float pitch = safeFloat(call.getDouble("pitch"), 0.92f, 0.5f, 1.5f);
        float volume = safeFloat(call.getDouble("volume"), 0.9f, 0.0f, 1.0f);

        textToSpeech.stop();
        if (!prepareBedtimeSpeech()) {
            call.reject("Android text-to-speech is unavailable. Enable or install an English system voice in Android settings.");
            return;
        }
        textToSpeech.setSpeechRate(rate);
        textToSpeech.setPitch(pitch);

        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume);

        List<String> chunks = splitForSpeech(text);
        activeUtterancePrefix = "sweetdreams-story-" + System.currentTimeMillis() + "-";
        activeFinalUtteranceId = activeUtterancePrefix + (chunks.size() - 1);

        for (int i = 0; i < chunks.size(); i++) {
            int queueMode = i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
            int result = textToSpeech.speak(chunks.get(i), queueMode, params, activeUtterancePrefix + i);
            if (result != TextToSpeech.SUCCESS) {
                textToSpeech.stop();
                activeUtterancePrefix = "";
                activeFinalUtteranceId = "";
                call.reject("Android text-to-speech could not start.");
                return;
            }
        }

        call.resolve();
    }

    private float safeFloat(Double value, float fallback, float min, float max) {
        if (value == null || value.isNaN() || value.isInfinite()) {
            return fallback;
        }

        return Math.max(min, Math.min(max, value.floatValue()));
    }

    private boolean canSpeakEnglish() {
        if (textToSpeech == null || !ready) return false;

        int languageStatus = textToSpeech.isLanguageAvailable(Locale.US);
        return languageStatus >= TextToSpeech.LANG_AVAILABLE;
    }

    private boolean prepareBedtimeSpeech() {
        if (textToSpeech == null || !ready) return false;

        int languageStatus = textToSpeech.setLanguage(Locale.US);
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
            return false;
        }

        selectBedtimeVoice();
        return true;
    }

    private boolean selectBedtimeVoice() {
        if (textToSpeech == null) return false;

        Set<Voice> voices = textToSpeech.getVoices();
        if (voices == null || voices.isEmpty()) return false;

        Voice bestVoice = null;
        int bestScore = Integer.MIN_VALUE;

        for (Voice voice : voices) {
            Locale locale = voice.getLocale();
            if (locale == null || !locale.getLanguage().equals(Locale.ENGLISH.getLanguage())) continue;
            if (voice.isNetworkConnectionRequired()) continue;

            int score = 0;
            String name = voice.getName() == null ? "" : voice.getName().toLowerCase(Locale.US);
            String country = locale.getCountry() == null ? "" : locale.getCountry().toLowerCase(Locale.US);

            if ("us".equals(country)) score += 8;
            score += 6;
            if (name.contains("female")) score += 5;
            if (name.contains("samantha") || name.contains("jenny") || name.contains("aria")) score += 4;
            if (name.contains("en-us") || name.contains("united-states")) score += 3;
            score += voice.getQuality();
            score -= voice.getLatency();

            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        }

        if (bestVoice != null) {
            textToSpeech.setVoice(bestVoice);
            return true;
        }

        return false;
    }

    private List<String> splitForSpeech(String text) {
        int maxLength = Math.min(TextToSpeech.getMaxSpeechInputLength() - 200, 3600);
        List<String> chunks = new ArrayList<>();
        String normalized = text.replace("\r", "").trim();

        while (normalized.length() > maxLength) {
            int splitAt = findSplitIndex(normalized, maxLength);
            chunks.add(normalized.substring(0, splitAt).trim());
            normalized = normalized.substring(splitAt).trim();
        }

        if (!normalized.isEmpty()) {
            chunks.add(normalized);
        }

        return chunks;
    }

    private int findSplitIndex(String text, int maxLength) {
        int splitAt = Math.max(text.lastIndexOf("\n", maxLength), text.lastIndexOf(". ", maxLength));
        splitAt = Math.max(splitAt, text.lastIndexOf("! ", maxLength));
        splitAt = Math.max(splitAt, text.lastIndexOf("? ", maxLength));
        if (splitAt < maxLength / 2) {
            splitAt = text.lastIndexOf(" ", maxLength);
        }
        if (splitAt < maxLength / 2) {
            splitAt = maxLength;
        }
        return splitAt + 1;
    }

    private void notifyError(String utteranceId, int errorCode) {
        if (
            utteranceId != null &&
            !activeUtterancePrefix.isEmpty() &&
            !utteranceId.startsWith(activeUtterancePrefix)
        ) {
            return;
        }

        JSObject payload = new JSObject();
        payload.put("error", "Android text-to-speech failed.");
        if (errorCode != 0) {
            payload.put("code", errorCode);
        }
        notifyListeners("error", payload);
    }

    @Override
    protected void handleOnDestroy() {
        pendingSpeakCall = null;
        activeUtterancePrefix = "";
        activeFinalUtteranceId = "";
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        ready = false;
        super.handleOnDestroy();
    }
}
