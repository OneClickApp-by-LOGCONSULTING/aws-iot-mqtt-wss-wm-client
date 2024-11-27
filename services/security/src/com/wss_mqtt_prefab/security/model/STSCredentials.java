package com.wss_mqtt_prefab.security.model;
import com.fasterxml.jackson.annotation.JsonProperty;

public class STSCredentials {
    @JsonProperty("access_key_id")
    private final String accessKeyId;

    @JsonProperty("secret_access_key")
    private final String secretAccessKey;

    @JsonProperty("session_token")
    private final String sessionToken;

    public STSCredentials(
            @JsonProperty("access_key_id") String accessKeyId,
            @JsonProperty("secret_access_key") String secretAccessKey,
            @JsonProperty("session_token") String sessionToken) {
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.sessionToken = sessionToken;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public String getSecretAccessKey() {
        return secretAccessKey;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    @Override
    public String toString() {
        return "STSCredentials{" +
                "accessKeyId='" + accessKeyId + '\'' +
                ", secretAccessKey='" + secretAccessKey + '\'' +
                ", sessionToken='" + sessionToken + '\'' +
                '}';
    }
}
