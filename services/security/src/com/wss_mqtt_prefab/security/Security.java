/*Copyright (c) 2016-2017 logconsulting.it All Rights Reserved.
 This software is the confidential and proprietary information of logconsulting.it You shall not disclose such Confidential Information and shall use it only in accordance
 with the terms of the source code license agreement you entered into with logconsulting.it*/
package com.wss_mqtt_prefab.security;

import com.wavemaker.commons.WMRuntimeException;
import com.wss_mqtt_prefab.security.model.STSCredentials;
import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;

 
import com.wavemaker.runtime.security.SecurityService;
import com.wavemaker.runtime.service.annotations.ExposeToClient;
import com.wavemaker.runtime.service.annotations.HideFromClient;
import org.springframework.beans.factory.annotation.Value;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetSessionTokenRequest;
import software.amazon.awssdk.services.sts.model.GetSessionTokenResponse;

//import com.wss_mqtt_prefab.security.model.*;

/**
 * This is a singleton class with all its public methods exposed as REST APIs via generated controller class.
 * To avoid exposing an API for a particular public method, annotate it with @HideFromClient.
 * <p>
 * Method names will play a major role in defining the Http Method for the generated APIs. For example, a method name
 * that starts with delete/remove, will make the API exposed as Http Method "DELETE".
 * <p>
 * Method Parameters of type primitives (including java.lang.String) will be exposed as Query Parameters &
 * Complex Types/Objects will become part of the Request body in the generated API.
 * <p>
 * NOTE: We do not recommend using method overloading on client exposed methods.
 */
@ExposeToClient
public class Security {

    private static final Logger logger = LoggerFactory.getLogger(Security.class);


    @Value("${app.environment.accessKeyId}")
    private String accessKeyId;
    @Value("${app.environment.secretAccessKey}")
    private String secretAccessKey;


    public STSCredentials getSTSSessionToken() {
        logger.info(accessKeyId + ":" + secretAccessKey);
        // Create AWS Basic Credentials
        AwsBasicCredentials awsCreds = AwsBasicCredentials.create(accessKeyId, secretAccessKey);

        // Build STS Client with the credentials
        try (StsClient stsClient = StsClient.builder()
                .credentialsProvider(StaticCredentialsProvider.create(awsCreds)).region(Region.AWS_GLOBAL)
                .build()) {

            // Create a GetSessionTokenRequest
            GetSessionTokenRequest sessionTokenRequest = GetSessionTokenRequest.builder()
                    .durationSeconds(3600) // Optional: Default is 3600 seconds (1 hour)
                    .build();

            // Call STS to get a session token
            GetSessionTokenResponse sessionTokenResponse = stsClient.getSessionToken(sessionTokenRequest);

            // Extract the session token as a string
            // Extract and return STS credentials
            return new STSCredentials(
                    sessionTokenResponse.credentials().accessKeyId(),
                    sessionTokenResponse.credentials().secretAccessKey(),
                    sessionTokenResponse.credentials().sessionToken()
            );
        } catch (Exception e) {
            logger.info("(getSTSSessionToken) Unable to retrieve token", e);
            throw new WMRuntimeException("Error retrieving STS session token: " + e.getMessage(), e);
        }
    }

}
