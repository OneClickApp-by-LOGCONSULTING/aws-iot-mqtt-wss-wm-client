/*
 * Use App.getDependency for Dependency Injection
 * eg: var DialogService = App.getDependency('DialogService');
 */

/*
 * This function is invoked whenever any property of the prefab is changed.
 * @key: The name of the property that changed.
 * @newVal: The new value assigned to the property.
 * @oldVal: The previous value of the property.
 */
Prefab.onPropertyChange = function (key, newVal, oldVal) {
    // Log the property change details and check connection status.
    console.log("Prop changed ", key, newVal, " Is connected : ", Prefab.safeIsConnected());

    // If the 'queuesize' property is changed, skip further processing.
    if (_.includes(['queuesize'], key)) return false;

    // If not connected, invoke the STSSecurityInformations to get AWS credentials.
    if (!Prefab.safeIsConnected()) {
        Prefab.Variables.STSSecurityInformations.invoke();
    } else {
        // Dispatch property changes if connected.
        Prefab.dispatchPropertyChanges(key, newVal, oldVal);
    }
};

/*
 * Handles the property changes and performs actions based on the key.
 * @key: The property name that changed.
 * @newVal: The new value of the property.
 * @oldVal: The old value of the property.
 */
Prefab.dispatchPropertyChanges = function (key, newVal, oldVal) {

    // Action when the 'topics' property is changed.
    switch (key) {
        case "topics":
            newVal = newVal.split(","); // Split the topics string into an array.
            console.log("New topics to subscribe ", newVal);
            Prefab.mqttHandler.subscribeTopics(newVal); // Subscribe to the new topics.
            break;

        // Action when the 'publish' property is changed.
        case "publish":
            // Create a message object and send it using MQTT.
            const message = new Paho.Message(JSON.stringify(newVal.payload));
            message.destinationName = newVal.topic;
            Prefab.mqttHandler.mqttClient.send(message);
            Prefab.onPublish(null, message); // Trigger the publish event.
            break;

        // Action when the 'queuesize' property is changed.
        case "queuesize":
            if (newVal > oldVal) {
                Prefab.cq.enlarge(newVal); // Enlarge the queue if the new size is greater.
            } else {
                Prefab.cq.shrink(newVal); // Shrink the queue if the new size is smaller.
            }
            break;
    }
};

/*
 * Called when the prefab is initialized and ready.
 */
Prefab.onReady = function () {
    console.log("wss-mqtt-prefab Prefab ready", Prefab); // Log that the prefab is ready.
    if (!Prefab.safeIsConnected()) {
        Prefab.Variables.STSSecurityInformations.invoke();
    }
};

/*
 * Safely checks if the MQTT client is connected.
 * Returns true if connected, false otherwise.
 */
Prefab.safeIsConnected = function () {
    try {
        return Prefab.mqttHandler.mqttClient.isConnected();
    } catch {
        return false;
    }
};

/*
 * Initializes the MQTT connection and starts the session.
 */
Prefab.startMqttConnection = function () {
    console.log("Initializing connection... is Connected : ", Prefab.safeIsConnected());

    // If already connected, do nothing.
    if (Prefab.safeIsConnected()) return false;

    // Retrieve credentials and other parameters.
    const accessKeyId = Prefab.accesskeyid;
    const secretAccessKey = Prefab.secretaccesskey;
    const sessionToken = Prefab.sessiontoken;
    const clientId = Prefab.clientid;
    const region = Prefab.region;
    const endpoint = Prefab.endpoint;
    const topics = Prefab.topics;

    // Set up the configuration object for the connection.
    const applicationData = {
        clientId,
        accessKeyId,
        secretAccessKey,
        sessionToken,
        region,
        endpoint,
        topics
    };

    // Initialize the circular queue.
    Prefab.cq = new CircularQueue(Prefab.queuesize);

    // Create a new MQTT client handler instance.
    Prefab.mqttHandler = new MqttClientHandler(applicationData);

    // Set callback for successful MQTT connection.
    Prefab.mqttHandler.setConnectCallback(() => {
        console.log("Mqtt PREFAB Connected!!");
        Prefab.dispatchPropertyChanges("topics", Prefab.topics, null);
    });

    // Set callback for handling incoming messages.
    Prefab.mqttHandler.setMessageCallback((message) => {
        console.log("Adding message to circular queue:", message);
        Prefab.lastmessage = message;
        Prefab.onMessagearrive(null, message);
        Prefab.cq.enqueue(message); // Enqueue the message.
        Prefab.cq.printQueue(); // Print the queue.
        Prefab.Variables.payloadsString.setData(_.filter(Prefab.cq.queue, (value) => value !== null && value !== undefined && value !== ''));
        Prefab.circularqueue = Prefab.cq; // Update the circular queue output.
    });

    // Start the MQTT session.
    Prefab.mqttHandler.startSession();
};

/*
 * Function to group payloads by the topic.
 */
Prefab.payloadsStringList1groupby = function (row) {
    return row.topic.trim();
};

/*
 * Button click handler to publish a message.
 */
Prefab.button1Click = function ($event, widget) {
    Prefab.publish = { "topic": Prefab.Widgets.textTopic.datavalue, "payload": Prefab.Widgets.textareaPayload.datavalue };
};

/*
 * Callback when STS Security Information is successfully retrieved.
 */
Prefab.STSSecurityInformationsonSuccess = function (variable, data) {
    // Store the AWS credentials.
    Prefab.accesskeyid = data.access_key_id;
    Prefab.secretaccesskey = data.secret_access_key;
    Prefab.sessiontoken = data.session_token;
    storeToken(data, 3500); // Store the token for 3500 seconds.

    // If not connected, start the MQTT connection.
    if (!Prefab.safeIsConnected()) Prefab.startMqttConnection();
};

/*
 * Callback before updating STS Security Information.
 */
Prefab.STSSecurityInformationsonBeforeUpdate = function (variable, inputData, options) {
    debugger;
    const validToken = isTokenValid();
    if (validToken) {
        var token = getActualToken();
        Prefab.accesskeyid = token.access_key_id;
        Prefab.secretaccesskey = token.secret_access_key;
        Prefab.sessiontoken = token.session_token;
        if (!Prefab.safeIsConnected()) Prefab.startMqttConnection();
        return false;
    }
};

/*
 * Retrieve the actual token from local storage and check its validity.
 */
function getActualToken() {
    const tokenData = localStorage.getItem("stsAuthToken");
    if (!tokenData) {
        console.log("No token found in session storage.");
        return null;
    }

    const { token, expirationTime } = JSON.parse(tokenData);
    const currentTime = Date.now();

    if (currentTime < expirationTime) {
        console.log("Token is still valid.");
        return token;
    }
}

/*
 * Store the token with an expiration time in local storage.
 */
function storeToken(token, durationInSeconds) {
    const expirationTime = Date.now() + durationInSeconds * 1000;
    const tokenData = { token: token, expirationTime: expirationTime };
    localStorage.setItem("stsAuthToken", JSON.stringify(tokenData));
    console.log("Token stored successfully.");
}

/*
 * Check if the token in local storage is valid based on expiration time.
 */
function isTokenValid() {
    const tokenData = localStorage.getItem("stsAuthToken");
    if (!tokenData) {
        console.log("No token found in session storage.");
        return false;
    }

    const { token, expirationTime } = JSON.parse(tokenData);
    const currentTime = Date.now();

    if (currentTime < expirationTime) {
        console.log("Token is valid.");
        return token;
    } else {
        return false;
    }
}
