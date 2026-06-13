package com.sweetdreams.bedtimestories;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "NativeTts")
public class NativeTtsPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private static final String SYSTEM_VOICE_ID = "android-system";
    private static final String LOCAL_VOICE_PREFIX = "android-voice:";

    private TextToSpeech textToSpeech;
    private boolean ready = false;
    private PluginCall pendingSpeakCall;
    private String activeUtterancePrefix = "";
    private String activeFinalUtteranceId = "";
    private String selectedVoiceId = SYSTEM_VOICE_ID;

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
    public void listVoices(PluginCall call) {
        JSArray voices = new JSArray();
        voices.put(createSystemVoice());

        List<Voice> localVoices = getOfflineEnglishVoices();
        for (int i = 0; i < localVoices.size(); i++) {
            voices.put(createLocalVoice(localVoices.get(i), i + 1));
        }

        JSObject result = new JSObject();
        result.put("voices", voices);
        result.put("selectedVoiceId", selectedVoiceId);
        result.put("offlineNeuralEngine", "not-bundled");
        call.resolve(result);
    }

    @PluginMethod
    public void selectVoice(PluginCall call) {
        String voiceId = call.getString("voiceId", SYSTEM_VOICE_ID).trim();
        if (!isSupportedVoiceId(voiceId)) {
            call.reject("That local Android voice is no longer available on this device.");
            return;
        }

        selectedVoiceId = voiceId;
        call.resolve();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        String voiceId = call.getString("voiceId", selectedVoiceId).trim();
        if (text.isEmpty()) {
            call.reject("No story text provided.");
            return;
        }
        if (!isSupportedVoiceId(voiceId)) {
            call.reject("That local Android voice is no longer available on this device.");
            return;
        }
        selectedVoiceId = voiceId;

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
        String voiceId = call.getString("voiceId", selectedVoiceId).trim();
        float rate = safeFloat(call.getDouble("rate"), 0.82f, 0.5f, 1.5f);
        float pitch = safeFloat(call.getDouble("pitch"), 0.92f, 0.5f, 1.5f);
        float volume = safeFloat(call.getDouble("volume"), 0.9f, 0.0f, 1.0f);

        textToSpeech.stop();
        if (!prepareBedtimeSpeech(voiceId)) {
            call.reject("Android text-to-speech is unavailable. Enable or install an English system voice in Android settings.");
            return;
        }
        selectedVoiceId = voiceId;
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

    private JSObject createSystemVoice() {
        JSObject voice = new JSObject();
        voice.put("id", SYSTEM_VOICE_ID);
        voice.put("name", "Android system bedtime voice");
        voice.put("provider", "android-system");
        voice.put("localOnly", true);
        voice.put("neural", false);
        voice.put("available", canSpeakEnglish());
        voice.put("description", "Private on-device Android text-to-speech fallback.");
        return voice;
    }

    private JSObject createLocalVoice(Voice androidVoice, int index) {
        Locale locale = androidVoice.getLocale();
        String languageName = locale == null ? "English" : locale.getDisplayName(Locale.US);
        String rawName = androidVoice.getName() == null ? "" : androidVoice.getName();

        JSObject voice = new JSObject();
        voice.put("id", LOCAL_VOICE_PREFIX + rawName);
        voice.put("name", "Local voice " + index + " - " + languageName);
        voice.put("provider", "android-system");
        voice.put("localOnly", true);
        voice.put("neural", looksNeural(androidVoice));
        voice.put("available", true);
        voice.put("description", "Installed Android voice: " + rawName);
        return voice;
    }

    private boolean canSpeakEnglish() {
        if (textToSpeech == null || !ready) return false;

        int languageStatus = textToSpeech.isLanguageAvailable(Locale.US);
        return languageStatus >= TextToSpeech.LANG_AVAILABLE;
    }

    private boolean prepareBedtimeSpeech(String voiceId) {
        if (textToSpeech == null || !ready) return false;

        int languageStatus = textToSpeech.setLanguage(Locale.US);
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
            return false;
        }

        if (SYSTEM_VOICE_ID.equals(voiceId)) {
            selectBedtimeVoice();
            return true;
        }

        Voice selectedVoice = findVoiceById(voiceId);
        return selectedVoice != null && textToSpeech.setVoice(selectedVoice) == TextToSpeech.SUCCESS;
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

    private boolean isSupportedVoiceId(String voiceId) {
        return SYSTEM_VOICE_ID.equals(voiceId) || findVoiceById(voiceId) != null;
    }

    private Voice findVoiceById(String voiceId) {
        if (textToSpeech == null || voiceId == null || !voiceId.startsWith(LOCAL_VOICE_PREFIX)) return null;

        String voiceName = voiceId.substring(LOCAL_VOICE_PREFIX.length());
        for (Voice voice : getOfflineEnglishVoices()) {
            if (voiceName.equals(voice.getName())) return voice;
        }
        return null;
    }

    private List<Voice> getOfflineEnglishVoices() {
        List<Voice> result = new ArrayList<>();
        if (textToSpeech == null || !ready) return result;

        Set<Voice> voices = textToSpeech.getVoices();
        if (voices == null) return result;

        for (Voice voice : voices) {
            Locale locale = voice.getLocale();
            if (locale == null || !Locale.ENGLISH.getLanguage().equals(locale.getLanguage())) continue;
            if (voice.isNetworkConnectionRequired()) continue;
            result.add(voice);
        }

        result.sort(Comparator.comparingInt(this::voiceScore).reversed().thenComparing(voice -> voice.getName() == null ? "" : voice.getName()));
        return result;
    }

    private int voiceScore(Voice voice) {
        Locale locale = voice.getLocale();
        String country = locale == null || locale.getCountry() == null ? "" : locale.getCountry();
        String name = voice.getName() == null ? "" : voice.getName().toLowerCase(Locale.US);
        int score = voice.getQuality() - voice.getLatency();

        if (Locale.US.getCountry().equals(country)) score += 8;
        if (looksNeural(voice)) score += 6;
        if (name.contains("female") || name.contains("samantha") || name.contains("jenny") || name.contains("aria")) score += 4;
        return score;
    }

    private boolean looksNeural(Voice voice) {
        String name = voice.getName() == null ? "" : voice.getName().toLowerCase(Locale.US);
        return voice.getQuality() >= Voice.QUALITY_HIGH || name.contains("neural") || name.contains("natural");
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
