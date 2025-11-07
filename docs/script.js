// script.js - Web dashboard MQTT client + UI handlers
const MQTT_BROKER = "afc8a0ac2ccf462c8f92b932403518df.s1.eu.hivemq.cloud";
const MQTT_PORT = 8884; // use TLS websocket port if using wss
const MQTT_USER = "hivemq.webclient.1761751067946";
const MQTT_PASS = "wy.b7f8cB*0GTUW&4Ha:";
const TOPIC_SENSORS = "project/sensors";
const TOPIC_STATUS = "project/status";
const TOPIC_CONTROL = "project/control";

let client;
let statusText = document.getElementById('status');
let statusDot = document.getElementById('status-dot');

function onConnect() {
  console.log("MQTT connected");
  statusText.textContent = "Connected";
  statusDot.style.background = "#10b981";
  client.subscribe(TOPIC_SENSORS);
  client.subscribe(TOPIC_STATUS);
}

function onConnectionLost(response) {
  console.log("MQTT connection lost", response);
  statusText.textContent = "Disconnected";
  statusDot.style.background = "#ef4444";
}

function onMessageArrived(message) {
  try {
    const topic = message.destinationName;
    const payload = message.payloadString;
    const data = JSON.parse(payload);
    if (topic === TOPIC_SENSORS) updateSensorReadings(data);
    if (topic === TOPIC_STATUS) updateControlsFromStatus(data);
  } catch(e) {
    console.error("Invalid message", e);
  }
}

function connectMqtt() {
  // WSS (secure websocket) URL—Paho uses host/port; secure choice depends on broker.
  client = new Paho.MQTT.Client(MQTT_BROKER, Number(MQTT_PORT), "web-client-" + parseInt(Math.random()*1000));
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;
  const opts = {
    useSSL: true,
    userName: MQTT_USER,
    password: MQTT_PASS,
    onSuccess: onConnect,
    onFailure: (err) => {
      console.error("MQTT connect failed", err);
      statusText.textContent = "Disconnected";
      statusDot.style.background = "#ef4444";
      setTimeout(connectMqtt, 3000);
    }
  };
  client.connect(opts);
}

// UI update functions
function updateSensorReadings(data) {
  if (data.dht_temp !== undefined) document.getElementById('insideTemp').textContent = Number(data.dht_temp).toFixed(1);
  if (data.dht_humidity !== undefined) document.getElementById('insideHum').textContent = Number(data.dht_humidity).toFixed(1);
  if (data.pressure_hpa !== undefined) document.getElementById('outsidePress').textContent = Number(data.pressure_hpa).toFixed(0);
  if (data.lightPercent !== undefined) {
    document.getElementById('lightLux').textContent = Number(data.lightPercent).toFixed(1);
    const st = document.getElementById('lightStatusText');
    if (data.lightPercent < 20) { st.textContent = "Low — Turning ON light 💡"; st.style.color = "#ef4444"; }
    else { st.textContent = "High — Light OFF ☀️"; st.style.color = "#10b981"; }
  }
  if (data.mq135 !== undefined) document.getElementById('mq135Value').textContent = Number(data.mq135).toFixed(0);
  if (data.door !== undefined) {
    document.getElementById('door-status').textContent = data.door ? "OPEN" : "CLOSED";
  }
}

function updateControlsFromStatus(data) {
  if (data.fan !== undefined) {
    const el = document.getElementById('fan-control');
    document.getElementById('fan-status').textContent = data.fan ? "ON" : "OFF";
    el.classList.toggle('active', !!data.fan);
  }
  if (data.light !== undefined) {
    const el = document.getElementById('light-control');
    document.getElementById('light-status').textContent = data.light ? "ON" : "OFF";
    el.classList.toggle('active', !!data.light);
  }
  if (data.mode !== undefined) {
    document.getElementById('mode-toggle').checked = (data.mode === "Manual");
  }
  if (data.door !== undefined) {
    document.getElementById('door-status').textContent = data.door ? "OPEN" : "CLOSED";
  }
}

// UI: toggle functions (send control messages)
function publishControl(cmd) {
  if (!client || !client.isConnected()) { alert("MQTT not connected"); return; }
  var message = new Paho.MQTT.Message(cmd);
  message.destinationName = TOPIC_CONTROL;
  client.send(message);
}

function toggleFan() { publishControl("fan-toggle"); }
function toggleLight() { publishControl("light-toggle"); }
function toggleDoor() { publishControl("door-toggle"); }
function toggleMode() { publishControl("mode-toggle"); }

window.addEventListener('load', () => {
  connectMqtt();
  document.getElementById('mode-toggle').addEventListener('change', toggleMode);
  // when user clicks control items we already wired onclick in HTML to call toggle functions
});
