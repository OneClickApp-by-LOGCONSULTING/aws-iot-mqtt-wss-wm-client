// Class for handling MQTT client operations and connection management
class MqttClientHandler {
    // Constructor initializes the handler with application data and prepares client variables
    constructor(applicationData) {
        this.applicationData = applicationData;
        this.mqttClient = null;   // MQTT client instance
        this.messageCallback = null; // Callback for message reception
        this.connectCallback = null; // Callback for successful connection
    }

    // Starts the MQTT session by building the URL and signing the request for AWS IoT
    async startSession() {
        // Generate timestamp and format required data
        const time = moment.utc();
        const dateStamp = time.format("YYYYMMDD");
        const amzdate = dateStamp + "T" + time.format("HHmmss") + "Z";

        // Define constants to create the signed request for AWS IoT
        const service = "iotdevicegateway";
        const region = this.applicationData.region;
        const secretKey = this.applicationData.secretAccessKey;
        const accessKey = this.applicationData.accessKeyId;
        const algorithm = "AWS4-HMAC-SHA256";
        const method = "GET";
        const canonicalUri = "/mqtt";
        const host = this.applicationData.endpoint;
        const credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";
        let canonicalQuerystring = "X-Amz-Algorithm=AWS4-HMAC-SHA256";
        canonicalQuerystring += "&X-Amz-Credential=" + encodeURIComponent(accessKey + "/" + credentialScope);
        canonicalQuerystring += "&X-Amz-Date=" + amzdate;
        canonicalQuerystring += "&X-Amz-Expires=86400";
        canonicalQuerystring += "&X-Amz-SignedHeaders=host";
        const canonicalHeaders = "host:" + host + "\n";
        const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Empty payload
        const canonicalRequest = method + "\n" + canonicalUri + "\n" + canonicalQuerystring + "\n" + canonicalHeaders + "\nhost\n" + payloadHash;
        const stringToSign = algorithm + "\n" + amzdate + "\n" + credentialScope + "\n" + (await SigV4Utils.sha256(canonicalRequest));
        const signingKey = await SigV4Utils.getSignatureKey(secretKey, dateStamp, region, service);
        const signature = await SigV4Utils.sign(signingKey, stringToSign);
        canonicalQuerystring += "&X-Amz-Signature=" + signature;
        
        // Add session token if available
        if (this.applicationData.sessionToken !== "" && this.applicationData.sessionToken !== undefined) {
            canonicalQuerystring += "&X-Amz-Security-Token=" + encodeURIComponent(this.applicationData.sessionToken);
        }

        // Construct request URL
        const requestUrl = "wss://" + host + canonicalUri + "?" + canonicalQuerystring;
        console.log(requestUrl); // Log the connection URL

        // Initialize MQTT client with the constructed URL and client ID
        this.mqttClient = new Paho.Client(requestUrl, this.applicationData.clientId);
        
        // Set callback functions for message arrival and connection loss
        this.mqttClient.onMessageArrived = this.onMessageArrived.bind(this);
        this.mqttClient.onConnectionLost = this.onConnectionLost.bind(this);
        
        // Connect to the MQTT broker with the specified options
        this.mqttClient.connect(this.getConnectOptions());
    }

    // Return connection options for the MQTT client
    getConnectOptions() {
        return {
            onSuccess: this.onConnect.bind(this),  // Callback on successful connection
            onFailure: this.onFailure.bind(this),  // Callback on connection failure
            useSSL: true,  // Use SSL for secure connection
            timeout: 30  // Set connection timeout
        };
    }

    // Handle successful connection
    onConnect() {
        console.log("OK: Connected!");
        if (this.connectCallback) {
            this.connectCallback();  // Execute custom callback if defined
        }
    }

    // Handle connection failure
    onFailure(e) {
        console.log(e);  // Log failure details
    }

    // Handle messages that arrive from the MQTT broker
    onMessageArrived(m) {
        console.log("onMessageArrived:" + JSON.stringify(m));
        if (this.messageCallback) {
            this.messageCallback(m);  // Execute custom message callback if defined
        }
    }

    // Set the callback function for successful connection
    setConnectCallback(callback) {
        this.connectCallback = callback;  // Assign the provided callback function
    }

    // Set the callback function for message arrival
    setMessageCallback(callback) {
        this.messageCallback = callback;  // Assign the provided callback function
    }

    // Handle lost connection
    onConnectionLost(e) {
        console.log("onConnectionLost:" + e);  // Log connection loss details
    }

    // Subscribe to the provided list of MQTT topics
    async subscribeTopics(topics) {
        function validateMqttTopic(topic) {
            // Validate the topic based on certain rules (e.g., no slashes at ends, valid characters)
            if (typeof topic !== 'string' || topic.trim() === '') {
                return {valid: false, error: 'Topic should be a non-empty string'};
            }
            if (topic.startsWith('/') || topic.endsWith('/')) {
                return {valid: false, error: 'Topic should not start or end with a slash'};
            }
            if (topic.includes('//')) {
                return {valid: false, error: 'Topic should not contain consecutive slashes'};
            }
            const regex = /^[a-zA-Z0-9_\-+.]+(\/[a-zA-Z0-9_\-+.]+)*$/;
            if (!regex.test(topic)) {
                return {valid: false, error: 'Topic contains invalid characters'};
            }
            return {valid: true};
        }

        // Subscribe to each topic after validation
        for (const topic of topics) {
            try {
                if (validateMqttTopic(topic).valid) {
                    this.mqttClient.subscribe(topic);  // Subscribe to the valid topic
                    console.log("topic ", topic, " subscribed");
                } else {
                    console.error("topic ", topic, " not valid");
                }
            } catch (e) {
                console.error(e);  // Handle errors during subscription
            }
        }
    }
}

// Utility class for handling AWS SigV4 signing for secure requests
class SigV4Utils {
    constructor() {
        console.log("Load SigV4Utils");  // Log when the class is loaded
    }

    // Sign a message using the provided key
    static async sign(key, msg) {
        const hash = CryptoJS.HmacSHA256(msg, key);  // Use HMAC-SHA256 for signing
        return hash.toString(CryptoJS.enc.Hex);  // Return the signature as a hexadecimal string
    }

    // Calculate the SHA-256 hash of a message
    static async sha256(msg) {
        const hash = CryptoJS.SHA256(msg);  // SHA-256 hash
        return hash.toString(CryptoJS.enc.Hex);  // Return hash as hexadecimal string
    }

    // Generate the signature key based on AWS specifications
    static async getSignatureKey(key, dateStamp, regionName, serviceName) {
        const kDate = CryptoJS.HmacSHA256(dateStamp, 'AWS4' + key);  // HMAC with date
        const kRegion = CryptoJS.HmacSHA256(regionName, kDate);  // HMAC with region
        const kService = CryptoJS.HmacSHA256(serviceName, kRegion);  // HMAC with service
        const kSigning = CryptoJS.HmacSHA256('aws4_request', kService);  // Final signing key
        return kSigning;
    }
}

// Class implementing a circular queue to store MQTT messages
class CircularQueue {
    // Constructor sets the size and initializes the queue with default values
    constructor(size) {
        this.size = size;  // Maximum size of the queue
        this.queue = new Array(size);  // Array to store queue elements
        this.front = 0;  // Index of the front element
        this.rear = 0;   // Index of the rear element
        this.count = 0;  // Track the number of elements in the queue
    }

    // Check if the queue is full
    isFull() {
        return this.count === this.size;  // Return true if the queue is full
    }

    // Check if the queue is empty
    isEmpty() {
        return this.count === 0;  // Return true if the queue is empty
    }

    // Add an element to the queue
    enqueue(value) {
        if (this.isFull()) {
            // Remove front element if queue is full (FIFO)
            this.front = (this.front + 1) % this.size;
        } else {
            this.count++;  // Increase count if space is available
        }
        this.queue[this.rear] = value;  // Add the new value at the rear
        this.rear = (this.rear + 1) % this.size;  // Move rear pointer circularly
    }

    // Remove and return the front element from the queue
    dequeue() {
        if (this.isEmpty()) {
            console.log("Queue is empty. Cannot dequeue.");  // Log if queue is empty
            return null;
        }
        const value = this.queue[this.front];  // Get the front value
        this.front = (this.front + 1) % this.size;  // Move front pointer circularly
        this.count--;  // Decrease count
        return value;  // Return the dequeued value
    }

    // Peek at the front element without removing it
    peek() {
        if (this.isEmpty()) {
            console.log("Queue is empty.");  // Log if queue is empty
            return null;
        }
        return this.queue[this.front];  // Return the front element
    }

    // Print the current state of the queue
    printQueue() {
        if (this.isEmpty()) {
            console.log("Queue is empty.");  // Log if queue is empty
            return;
        }
        let result = [];
        let i = this.front;
        for (let j = 0; j < this.count; j++) {
            result.push(this.queue[i]);  // Add each element to result array
            i = (i + 1) % this.size;  // Move index circularly
        }
        console.log("Queue:", result);  // Log the current queue elements
    }

    // Increase the queue size
    enlarge(newSize) {
        if (newSize <= this.size) {
            console.log("New size must be larger than current size.");  // Log error if new size is too small
            return false;
        }
        const newQueue = new Array(newSize);  // Create a new larger queue
        let i = this.front;
        for (let j = 0; j < this.count; j++) {
            newQueue[j] = this.queue[i];  // Copy elements to the new queue
            i = (i + 1) % this.size;  // Move index circularly
        }
        this.queue = newQueue;  // Replace old queue with the new queue
        this.front = 0;
        this.rear = this.count;
        this.size = newSize;  // Update size
        console.log(`Queue enlarged to size ${newSize}`);
        return true;
    }

    // Decrease the queue size
    shrink(newSize) {
        if (newSize >= this.size || newSize < this.count) {
            console.log("New size must be smaller than current size and should fit all elements.");  // Log error
            return false;
        }
        const newQueue = new Array(newSize);  // Create a new smaller queue
        let i = this.front;
        for (let j = 0; j < newSize; j++) {
            newQueue[j] = this.queue[i];  // Copy elements to the new queue
            i = (i + 1) % this.size;  // Move index circularly
        }
        this.queue = newQueue;  // Replace old queue with the new queue
        this.front = 0;
        this.rear = newSize;
        this.size = newSize;  // Update size
        console.log(`Queue shrunk to size ${newSize}`);
        return true;
    }
}
