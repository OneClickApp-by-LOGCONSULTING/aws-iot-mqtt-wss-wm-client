# Wavemaker 11 WebSocket Prefab for AWS IoT Core

This prefab connects to AWS IoT Core using WebSocket and MQTT. It facilitates communication between a web application and AWS IoT Core, enabling real-time message exchange. The prefab allows configuration and management of the WebSocket connection, message publishing, and subscription to IoT topics. It is designed to be used in Wavemaker 11 applications to help handle IoT data on the front end.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Input and Output Parameters](#input-and-output-parameters)
- [Events](#events)
- [FIFO Queue Behavior](#fofo-queue-behavior)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- **Wavemaker 11** environment
- **AWS IoT Core** credentials and endpoint details

### Steps to Install

1. **Download the Repository as a ZIP file:**
   - Visit the GitHub repository page.
   - Click on the "Code" button and select "Download ZIP".

2. **Upload to Wavemaker:**
   - Log in to your Wavemaker environment.
   - Navigate to your Wavemaker project dashboard.
   - Use the "PROJECT RESTORE" feature in Wavemaker to upload the downloaded ZIP file.
   - This will restore the prefab as part of your Wavemaker project.

3. **Deploy the prefab** within your Wavemaker 11 project.

After completing these steps, the prefab should be ready for use in your Wavemaker project.

## Usage

To use the WebSocket connection to AWS IoT Core, configure the following input and output parameters:

### Input and Output Parameters

| **Parameter**             | **Type**   | **Description**                                                                                                           | **Default Value**                                         |
|---------------------------|------------|---------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
| `clientid`                | string     | MQTT client ID. Set it to random to ensure uniqueness. AWS IoT Core rejects equal client IDs for the same connection.       | `test-client-id`                                          |
| `region`                  | string     | The AWS region where your IoT Core endpoint is hosted.                                                                     | `eu-west-1`                                               |
| `endpoint`                | string     | The AWS endpoint for IoT Core Message Broker.                                                                               | `dafasd33435asd-ats.iot.eu-west-1.amazonaws.com`          |
| `topics`                  | string     | A comma-separated list of topics to subscribe to. Example: `"test/test", "subscribe/here"`.                                | `""` (empty)                                              |
| `publish`                 | object     | The message to publish. It must be a JSON object with `topic` and `payload`. Example: `{ topic: "publish/in/this/topic", payload: "{'message':'hello'}" }`. | `""` (empty)                                              |
| `lastmessage`             | object     | The last message received, exposed as output.                                                                               | `""` (empty)                                              |
| `queuesize`               | number     | The size of the front-end circular queue. Defines how many messages to store before removing the oldest.                   | `10`                                                       |
| `circularqueue`           | object     | The entire circular queue, exposed as output.                                                                              | `""` (empty)                                              |
| `showgui`                 | boolean    | Whether to show the GUI for sending messages and controlling MQTT behavior.                                               | `true`                                                    |

### Events

- **onMessagearrive**: This event is triggered when a new message enters the circular queue.
- **onPublish**: This event is triggered when a new message is published to the broker.

### Notes

Data in the queue are not persisted inany way. We receive message and store it in a Circular Quesue useful for WM apps that work with IoT data received in real time.
The security is managed by STS token on AWS. Check if IAM role have the permission to request STS credentials. 
Credential and token rotation is managed for 1 hour in local stogare.

### Example Usage

1. Configure your `clientid`, `region`, `endpoint`, and `topics` parameters in the Wavemaker 11 prefab.
2. Optionally set the `publish` parameter with a message to send to a specific topic.
3. Use the provided GUI (if enabled) to interact with the MQTT connection, send messages, and monitor the `lastmessage` and `circularqueue`.

Example of publishing a message:

```json
{
  "topic": "test/topic",
  "payload": "{\"message\": \"hello from WebSocket\"}"
}


