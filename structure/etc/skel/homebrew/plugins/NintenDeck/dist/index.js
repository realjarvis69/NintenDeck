const manifest = {"name":"NintenDeck Settings"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const routerHook = api.routerHook;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } } return target; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaBluetooth (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M292.6 171.1L249.7 214l-.3-86 43.2 43.1m-43.2 219.8l43.1-43.1-42.9-42.9-.2 86zM416 259.4C416 465 344.1 512 230.9 512S32 465 32 259.4 115.4 0 228.6 0 416 53.9 416 259.4zm-158.5 0l79.4-88.6L211.8 36.5v176.9L138 139.6l-27 26.9 92.7 93-92.7 93 26.9 26.9 73.8-73.8 2.3 170 127.4-127.5-83.9-88.7z"},"child":[]}]})(props);
}function FaArrowLeft (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"},"child":[]}]})(props);
}function FaCheck (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"},"child":[]}]})(props);
}function FaCog (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"},"child":[]}]})(props);
}function FaEyeSlash (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.76 94.76 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"},"child":[]}]})(props);
}function FaEye (props) {
  return GenIcon({"attr":{"viewBox":"0 0 576 512"},"child":[{"tag":"path","attr":{"d":"M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"},"child":[]}]})(props);
}function FaLock (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"},"child":[]}]})(props);
}function FaMicrochip (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M416 48v416c0 26.51-21.49 48-48 48H144c-26.51 0-48-21.49-48-48V48c0-26.51 21.49-48 48-48h224c26.51 0 48 21.49 48 48zm96 58v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42V88h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zM30 376h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6z"},"child":[]}]})(props);
}function FaPlug (props) {
  return GenIcon({"attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M320,32a32,32,0,0,0-64,0v96h64Zm48,128H16A16,16,0,0,0,0,176v32a16,16,0,0,0,16,16H32v32A160.07,160.07,0,0,0,160,412.8V512h64V412.8A160.07,160.07,0,0,0,352,256V224h16a16,16,0,0,0,16-16V176A16,16,0,0,0,368,160ZM128,32a32,32,0,0,0-64,0v96h64Z"},"child":[]}]})(props);
}function FaQuestionCircle (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zM262.655 90c-54.497 0-89.255 22.957-116.549 63.758-3.536 5.286-2.353 12.415 2.715 16.258l34.699 26.31c5.205 3.947 12.621 3.008 16.665-2.122 17.864-22.658 30.113-35.797 57.303-35.797 20.429 0 45.698 13.148 45.698 32.958 0 14.976-12.363 22.667-32.534 33.976C247.128 238.528 216 254.941 216 296v4c0 6.627 5.373 12 12 12h56c6.627 0 12-5.373 12-12v-1.333c0-28.462 83.186-29.647 83.186-106.667 0-58.002-60.165-102-116.531-102zM256 338c-25.365 0-46 20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z"},"child":[]}]})(props);
}function FaWifi (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.02 6.23 22.4.38 145.92-133.68 371.3-133.71 517.25 0 6.38 5.85 16.26 5.71 22.4-.38l34.24-33.97c6.43-6.39 6.3-16.82-.36-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-115.26-101.93-290.21-101.82-405.34 0-6.9 6.1-7.12 16.69-.57 23.15l34.44 33.99c6 5.92 15.66 6.32 22.05.8 83.95-72.57 209.74-72.41 293.49 0 6.39 5.52 16.05 5.13 22.05-.8l34.44-33.99c6.56-6.46 6.33-17.06-.56-23.15z"},"child":[]}]})(props);
}function FaWrench (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M507.73 109.1c-2.24-9.03-13.54-12.09-20.12-5.51l-74.36 74.36-67.88-11.31-11.31-67.88 74.36-74.36c6.62-6.62 3.43-17.9-5.66-20.16-47.38-11.74-99.55.91-136.58 37.93-39.64 39.64-50.55 97.1-34.05 147.2L18.74 402.76c-24.99 24.99-24.99 65.51 0 90.5 24.99 24.99 65.51 24.99 90.5 0l213.21-213.21c50.12 16.71 107.47 5.68 147.37-34.22 37.07-37.07 49.7-89.32 37.91-136.73zM64 472c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24z"},"child":[]}]})(props);
}

// src/lib/i18n.ts

// ---------- Translations ----------
const defaultTranslations = {
    en: {
        plugin_title: "NintenDeck",
        // QAM
        brightness: "Brightness",
        volume: "Volume",
        oc_mode: "OC Mode",
        fan_mode: "Fan Mode",
        settings: "Settings",
        loading: "Loading...",
        // Tabs
        tab_system: "System",
        tab_tdp: "TDP & Fan",
        tab_utilities: "Utilities",
        tab_compatibility: "Compatibility",
        tab_wifi: "Wi-Fi",
        tab_bluetooth: "Bluetooth",
        // System
        brightness_label: "Brightness",
        volume_label: "Volume",
        // Wi-Fi
        wifi_title: "Wi-Fi",
        wifi_toggle: "Wi-Fi",
        wifi_refresh: "Refresh",
        wifi_no_connection: "No active connection",
        wifi_available_networks: "Available Networks",
        wifi_connect: "Connect",
        wifi_disconnect: "Disconnect",
        wifi_password: "Password",
        wifi_show_password: "Show Password",
        wifi_hide_password: "Hide Password",
        wifi_connecting: "Connecting...",
        wifi_connection_failed: "Connection failed",
        wifi_wrong_password: "Wrong password",
        wifi_enter_password: "Enter password for {ssid}",
        wifi_connected: "Connected",
        wifi_network: "Network",
        wifi_secured: "Secured",
        wifi_unsecured: "Open",
        wifi_show_all: "Show all devices",
        // Bluetooth
        bluetooth_title: "Bluetooth",
        bluetooth_toggle: "Bluetooth",
        bluetooth_refresh: "Refresh",
        bluetooth_paired_devices: "Paired Devices",
        bluetooth_available_devices: "Available Devices",
        bluetooth_no_devices: "No devices found",
        bluetooth_no_paired_devices: "No paired devices",
        bluetooth_devices_found: "devices found",
        bluetooth_connect: "Connect",
        bluetooth_disconnect: "Disconnect",
        bluetooth_pair: "Pair",
        bluetooth_forget: "Forget",
        bluetooth_connecting: "Connecting...",
        bluetooth_connection_failed: "Connection failed",
        bluetooth_paired: "Paired",
        bluetooth_trusted: "Trusted",
        bluetooth_show_all: "Show all devices",
        bluetooth_placeholder: "Bluetooth functionality will be implemented in a future update. Sorry for the inconvenience!",
        bluetooth_scanning: "Scanning for devices...",
        // TDP
        tdp_title: "TDP & Fan Control",
        cpu: "CPU",
        gpu: "GPU",
        battery: "Battery",
        tdp_mode: "TDP Mode",
        fan_mode_label: "Fan Mode",
        tdp_console: "Console",
        tdp_handheld: "Handheld",
        tdp_oc_cpu: "OC CPU",
        tdp_oc_gpu: "OC GPU",
        tdp_oc_all: "OC All",
        tdp_perf_all: "Perf All",
        tdp_perf_oc_all: "Perf OC All",
        fan_console: "Console",
        fan_handheld: "Handheld",
        fan_cool: "Cool",
        // Utilities
        utilities_title: "Utilities",
        reboot_hekate: "Reboot to Hekate",
        switch_desktop: "Switch to Desktop",
        confirm: "Confirm",
        // Compatibility
        compatibility_title: "Game Compatibility",
        filters: "Filters",
        search_games: "Search games...",
        show_installed_only: "Show only installed games",
        no_games_found: "No games found",
        sync: "Sync Database",
        syncing: "Syncing...",
        back: "Back",
        game_filters: "Filters",
        show_all: "Show all games",
        switch_model: "Switch Model",
        switch_lite: "Switch Lite",
        switch_oled: "Switch OLED",
        switch_v1: "Switch V1",
        switch_v2: "Switch V2",
        oc_mode_filter: "OC Mode",
        oc_mode_console: "Console",
        oc_mode_handheld: "Handheld",
        oc_mode_oc_cpu: "OC CPU",
        oc_mode_oc_gpu: "OC GPU",
        oc_mode_oc_all: "OC All",
        oc_mode_perf_oc: "Perf OC",
        oc_mode_perf_oc_all: "Perf OC All",
        rating_filter: "Rating",
        rating_perfect: "Perfect",
        rating_playable: "Playable",
        rating_unplayable: "Unplayable",
        rating_unsupported: "Unsupported",
        rating_unknown: "Unknown",
        compatibility_rating: "Rating",
        recommended_oc_mode: "Recommended OC Mode",
        average_fps: "Average FPS",
        recommended_proton: "Recommended Proton",
        launch_options: "Launch Options",
        extra_info: "Extra Info",
        submitted_by: "Submitted by",
        copy_to_clipboard: "Copy to Clipboard",
        copied: "Copied!",
        not_rated: "Not Rated",
        // Filters
        switch_model_filter: "Switch Model",
        oc_mode_filter_label: "OC Mode",
        rating_filter_label: "Rating",
        // Errors
        error_loading_games: "Failed to load games",
        error_loading_wifi: "Failed to load Wi-Fi networks",
        error_loading_bluetooth: "Failed to load Bluetooth devices",
        error_connection_failed: "Connection failed",
        error_wrong_password: "Wrong password",
        error_timeout: "Operation timed out",
        error_permission_denied: "Permission denied",
        error_no_network: "No network connection",
        // Placeholders
        placeholder_soon: "Coming soon!",
    },
    ru: {
        plugin_title: "NintenDeck",
        // QAM
        brightness: "Яркость",
        volume: "Громкость",
        oc_mode: "Режим OC",
        fan_mode: "Режим вентилятора",
        settings: "Настройки",
        loading: "Загрузка...",
        // Tabs
        tab_system: "Система",
        tab_tdp: "OC и вентилятор",
        tab_utilities: "Утилиты",
        tab_compatibility: "Совместимость",
        tab_wifi: "Wi-Fi",
        tab_bluetooth: "Bluetooth",
        // System
        brightness_label: "Яркость",
        volume_label: "Громкость",
        // Wi-Fi
        wifi_title: "Wi-Fi",
        wifi_toggle: "Wi-Fi",
        wifi_refresh: "Обновить",
        wifi_no_connection: "Нет активного подключения",
        wifi_available_networks: "Доступные сети",
        wifi_connect: "Подключиться",
        wifi_disconnect: "Отключиться",
        wifi_password: "Пароль",
        wifi_show_password: "Показать пароль",
        wifi_hide_password: "Скрыть пароль",
        wifi_connecting: "Подключение...",
        wifi_connection_failed: "Ошибка подключения",
        wifi_wrong_password: "Неверный пароль",
        wifi_enter_password: "Введите пароль для {ssid}",
        wifi_connected: "Подключено",
        wifi_network: "Сеть",
        wifi_secured: "Защищено",
        wifi_unsecured: "Открыто",
        wifi_show_all: "Показать все устройства",
        // Bluetooth
        bluetooth_title: "Bluetooth",
        bluetooth_toggle: "Bluetooth",
        bluetooth_refresh: "Обновить",
        bluetooth_paired_devices: "Сопряжённые устройства",
        bluetooth_available_devices: "Доступные устройства",
        bluetooth_no_devices: "Устройства не найдены",
        bluetooth_no_paired_devices: "Нет сопряжённых устройств",
        bluetooth_devices_found: "устройств найдено",
        bluetooth_connect: "Подключиться",
        bluetooth_disconnect: "Отключить",
        bluetooth_pair: "Сопрячь",
        bluetooth_forget: "Забыть",
        bluetooth_connecting: "Подключение...",
        bluetooth_connection_failed: "Ошибка подключения",
        bluetooth_paired: "Сопряжено",
        bluetooth_trusted: "Доверенное",
        bluetooth_show_all: "Показать все устройства",
        bluetooth_placeholder: "Функциональность Bluetooth будет добавлена в будущем обновлении. Извините за неудобства!",
        bluetooth_scanning: "Поиск устройств...",
        // TDP
        tdp_title: "Управление OC и вентилятором",
        cpu: "ЦП",
        gpu: "ГП",
        battery: "Батарея",
        tdp_mode: "Режим OC",
        fan_mode_label: "Режим вентилятора",
        tdp_console: "Консоль",
        tdp_handheld: "Портативный",
        tdp_oc_cpu: "OC ЦП",
        tdp_oc_gpu: "OC ГП",
        tdp_oc_all: "OC всё",
        tdp_perf_all: "Макс. производительность",
        tdp_perf_oc_all: "Макс. OC",
        fan_console: "Консоль",
        fan_handheld: "Портативный",
        fan_cool: "Охлажденный",
        // Utilities
        utilities_title: "Утилиты",
        reboot_hekate: "Перезагрузка в Hekate",
        switch_desktop: "Переключиться на рабочий стол",
        confirm: "Подтвердить",
        // Compatibility
        compatibility_title: "Совместимость игр",
        filters: "Фильтры",
        search_games: "Поиск игр...",
        show_installed_only: "Показать только установленные игры",
        no_games_found: "Игр не найдено",
        sync: "Синхронизировать базу данных",
        syncing: "Синхронизация...",
        back: "Назад",
        game_filters: "Фильтры",
        show_all: "Показать все игры",
        switch_model: "Модель Switch",
        switch_lite: "Switch Lite",
        switch_oled: "Switch OLED",
        switch_v1: "Switch V1",
        switch_v2: "Switch V2",
        oc_mode_filter: "Режим OC",
        oc_mode_console: "Консоль",
        oc_mode_handheld: "Портативный",
        oc_mode_oc_cpu: "OC ЦП",
        oc_mode_oc_gpu: "OC ГП",
        oc_mode_oc_all: "OC всё",
        oc_mode_perf_oc: "Макс. OC",
        oc_mode_perf_oc_all: "Макс. OC всё",
        rating_filter: "Рейтинг",
        rating_perfect: "Идеально",
        rating_playable: "Играбельно",
        rating_unplayable: "Неиграбельно",
        rating_unsupported: "Не поддерживается",
        rating_unknown: "Неизвестно",
        compatibility_rating: "Рейтинг",
        recommended_oc_mode: "Рекомендуемый режим OC",
        average_fps: "Средний FPS",
        recommended_proton: "Рекомендуемый Proton",
        launch_options: "Параметры запуска",
        extra_info: "Дополнительная информация",
        submitted_by: "Отправлено",
        copy_to_clipboard: "Копировать в буфер обмена",
        copied: "Скопировано!",
        not_rated: "Неизвестно",
        // Filters
        switch_model_filter: "Модель Switch",
        oc_mode_filter_label: "Режим OC",
        rating_filter_label: "Рейтинг",
        // Errors
        error_loading_games: "Не удалось загрузить игры",
        error_loading_wifi: "Не удалось загрузить сети Wi-Fi",
        error_loading_bluetooth: "Не удалось загрузить Bluetooth-устройства",
        error_connection_failed: "Ошибка подключения",
        error_wrong_password: "Неверный пароль",
        error_timeout: "Превышено время ожидания",
        error_permission_denied: "Отказано в доступе",
        error_no_network: "Нет сетевого подключения",
        // Placeholders
        placeholder_soon: "Скоро!",
    },
    fr: {
        plugin_title: "NintenDeck",
        // QAM
        brightness: "Luminosité",
        volume: "Volume",
        oc_mode: "Mode OC",
        fan_mode: "Mode Ventilateur",
        settings: "Paramètres",
        loading: "Chargement...",
        // Tabs
        tab_system: "Système",
        tab_tdp: "TDP & Ventilateur",
        tab_utilities: "Utilitaires",
        tab_compatibility: "Compatibilité",
        tab_wifi: "Wi-Fi",
        tab_bluetooth: "Bluetooth",
        // System
        brightness_label: "Luminosité",
        volume_label: "Volume",
        // Wi-Fi
        wifi_title: "Wi-Fi",
        wifi_toggle: "Wi-Fi",
        wifi_refresh: "Rafraîchir",
        wifi_no_connection: "Aucune connection active",
        wifi_available_networks: "Réseaux disponibles",
        wifi_connect: "Se connecter",
        wifi_disconnect: "Se déconnecter",
        wifi_password: "Mot de passe",
        wifi_show_password: "Montrer le mot de passe",
        wifi_hide_password: "Cacher le mot de passe",
        wifi_connecting: "Connection...",
        wifi_connection_failed: "Connection échouée",
        wifi_wrong_password: "Mauvais mot de passe",
        wifi_enter_password: "Saisir le mot de passe {ssid}",
        wifi_connected: "Connecté",
        wifi_network: "Réseau",
        wifi_secured: "Sécurisé",
        wifi_unsecured: "Ouvert",
        wifi_show_all: "Montrer tout les appareils",
        // Bluetooth
        bluetooth_title: "Bluetooth",
        bluetooth_toggle: "Bluetooth",
        bluetooth_refresh: "Rafraîchir",
        bluetooth_paired_devices: "Appareils appairés",
        bluetooth_available_devices: "Appareils disponibles",
        bluetooth_no_devices: "Aucun appareil trouvé",
        bluetooth_no_paired_devices: "Aucun appareil appairé",
        bluetooth_devices_found: "appareils trouvés",
        bluetooth_connect: "Se connecter",
        bluetooth_disconnect: "Se déconnecter",
        bluetooth_pair: "Appairer",
        bluetooth_forget: "Oublier",
        bluetooth_connecting: "Connection...",
        bluetooth_connection_failed: "Connection échouée",
        bluetooth_paired: "Appairé",
        bluetooth_trusted: "Fiable",
        bluetooth_show_all: "Montrer tout les appareils",
        bluetooth_placeholder: "La fonctionnalité Bluetooth sera implémentée dans une future mise à jour. Désolé pour le dérangement !",
        bluetooth_scanning: "Recherche d'appareils...",
        // TDP
        tdp_title: "TDP & Contrôle du Ventilateur",
        cpu: "CPU",
        gpu: "GPU",
        battery: "Batterie",
        tdp_mode: "Mode OC",
        fan_mode_label: "Mode Ventilateur",
        tdp_console: "Console",
        tdp_handheld: "Portable",
        tdp_oc_cpu: "OC CPU",
        tdp_oc_gpu: "OC GPU",
        tdp_oc_all: "OC All",
        tdp_perf_all: "Perf All",
        tdp_perf_oc_all: "Perf OC All",
        fan_console: "Console",
        fan_handheld: "Portable",
        fan_cool: "Cool",
        // Utilities
        utilities_title: "Utilitaires",
        reboot_hekate: "Rédémarrer vers Hekate",
        switch_desktop: "Basculer vers le Bureau",
        confirm: "Confirmer",
        // Compatibility
        compatibility_title: "Compatibilité des jeux",
        filters: "Filtres",
        search_games: "Rechercher des jeux...",
        show_installed_only: "Afficher uniquement les jeux installés",
        no_games_found: "Aucun jeu trouvé",
        sync: "Synchroniser la base de données",
        syncing: "Synchronisation...",
        back: "Retour",
        game_filters: "Filtres de jeu",
        show_all: "Tout afficher",
        switch_model: "Modèle de Switch",
        switch_lite: "Switch Lite",
        switch_oled: "Switch OLED",
        switch_v1: "Switch v1",
        switch_v2: "Switch v2",
        oc_mode_filter: "OC Mode",
        oc_mode_console: "Console",
        oc_mode_handheld: "Portable",
        oc_mode_oc_cpu: "OC CPU",
        oc_mode_oc_gpu: "OC GPU",
        oc_mode_oc_all: "OC All",
        oc_mode_perf_oc: "Perf OC",
        oc_mode_perf_oc_all: "Perf OC All",
        rating_filter: "Évaluation",
        rating_perfect: "Parfait",
        rating_playable: "Jouable",
        rating_unplayable: "Injouable",
        rating_unsupported: "Non pris en charge",
        rating_unknown: "Inconnu",
        compatibility_rating: "Évaluation",
        recommended_oc_mode: "Mode OC recommandé",
        average_fps: "FPS moyen",
        recommended_proton: "Version de Proton recommandée",
        launch_options: "Options de lancement",
        extra_info: "Informations supplémentaires",
        submitted_by: "Soumis par",
        copy_to_clipboard: "Copier dans le presse-papiers",
        copied: "Copié!",
        not_rated: "Non évalué",
        // Filters
        switch_model_filter: "Modèle de Switch",
        oc_mode_filter_label: "Mode OC",
        rating_filter_label: "Évaluation",
        // Errors
        error_loading_games: "Échec du chargement des jeux",
        error_loading_wifi: "Échec du chargement des paramètres Wi-Fi",
        error_loading_bluetooth: "Échec du chargement des paramètres Bluetooth",
        error_connection_failed: "Échec de la connexion",
        error_wrong_password: "Mot de passe incorrect",
        error_timeout: "Délai d'attente dépassé",
        error_permission_denied: "Permission refusée",
        error_no_network: "Aucune connexion réseau",
        // Placeholder
        placeholder_soon: "Bientôt disponible!",
    },
    es: {
        plugin_title: "NintenDeck",
        // QAM
        brightness: "Brillo",
        volume: "Volumen",
        oc_mode: "Modo OC",
        fan_mode: "Modo ventilador",
        settings: "Ajustes",
        loading: "Cargando...",
        // Tabs
        tab_system: "Sistema",
        tab_tdp: "TDP y ventilador",
        tab_utilities: "Utilidades",
        tab_compatibility: "Compatibilidad",
        tab_wifi: "Wi-Fi",
        tab_bluetooth: "Bluetooth",
        // System
        brightness_label: "Brillo",
        volume_label: "Volumen",
        // Wi-Fi
        wifi_title: "Wi-Fi",
        wifi_toggle: "Wi-Fi",
        wifi_refresh: "Actualizar",
        wifi_no_connection: "No hay conexiones activas",
        wifi_available_networks: "Redes disponibles",
        wifi_connect: "Conectar",
        wifi_disconnect: "Desconectar",
        wifi_password: "Contraseña",
        wifi_show_password: "Mostrar contraseña",
        wifi_hide_password: "Ocultar contraseña",
        wifi_connecting: "Conectando...",
        wifi_connection_failed: "Conexión fallida",
        wifi_wrong_password: "Contraseña incorrecta",
        wifi_enter_password: "Contraseña para {ssid}",
        wifi_connected: "Conectado",
        wifi_network: "Red",
        wifi_secured: "Segura",
        wifi_unsecured: "Abierta",
        wifi_show_all: "Mostrar todos los dispositivos",
        // Bluetooth
        bluetooth_title: "Bluetooth",
        bluetooth_toggle: "Bluetooth",
        bluetooth_refresh: "Actualizar",
        bluetooth_paired_devices: "Dispositivos emparejados",
        bluetooth_available_devices: "Dispositivos disponibles",
        bluetooth_no_devices: "No se encontraron dispositivos",
        bluetooth_no_paired_devices: "No hay dispositivos emparejados",
        bluetooth_devices_found: "dispositivos encontrados",
        bluetooth_connect: "Conectar",
        bluetooth_disconnect: "Desconectar",
        bluetooth_pair: "Vincular",
        bluetooth_forget: "Olvidar",
        bluetooth_connecting: "Conectando...",
        bluetooth_connection_failed: "Conexión fallida",
        bluetooth_paired: "Vinculado",
        bluetooth_trusted: "De confianza",
        bluetooth_show_all: "Mostrar todos los dispositivos",
        bluetooth_placeholder: "La funcionalidad Bluetooth se implementará en una futura actualización. ¡Disculpen las molestias!",
        bluetooth_scanning: "Buscando dispositivos...",
        // TDP
        tdp_title: "Control TDP y ventiladores",
        cpu: "CPU",
        gpu: "GPU",
        battery: "Batería",
        tdp_mode: "Modo TDP",
        fan_mode_label: "Modo ventilador",
        tdp_console: "Consola",
        tdp_handheld: "Portátil",
        tdp_oc_cpu: "OC CPU",
        tdp_oc_gpu: "OC GPU",
        tdp_oc_all: "OC a TODO",
        tdp_perf_all: "Rendimiento OC",
        tdp_perf_oc_all: "Rendimiento OC a TODO",
        fan_console: "Consola",
        fan_handheld: "Portátil",
        fan_cool: "Refrigeración",
        // Utilities
        utilities_title: "Utilidades",
        reboot_hekate: "Reiniciar a Hekate",
        switch_desktop: "Cambiar a Escritorio",
        confirm: "Confirmar",
        // Compatibility
        compatibility_title: "Compatibilidad de juegos",
        filters: "Filtros",
        search_games: "Buscar juegos...",
        show_installed_only: "Mostrar solo los juegos instalados",
        no_games_found: "No se encontraron juegos",
        sync: "Sincronizar base de datos",
        syncing: "Sincronizando...",
        back: "Atrás",
        game_filters: "Filtros",
        show_all: "Mostrar todos los juegos",
        switch_model: "Modelo de Switch",
        switch_lite: "Switch Lite",
        switch_oled: "Switch OLED",
        switch_v1: "Switch V1",
        switch_v2: "Switch V2",
        oc_mode_filter: "Modo OC",
        oc_mode_console: "Consola",
        oc_mode_handheld: "Portátil",
        oc_mode_oc_cpu: "OC CPU",
        oc_mode_oc_gpu: "OC GPU",
        oc_mode_oc_all: "OC a TODO",
        oc_mode_perf_oc: "Rendimiento OC",
        oc_mode_perf_oc_all: "Rendimiento OC a TODO",
        rating_filter: "Clasificación",
        rating_perfect: "Perfecto",
        rating_playable: "Jugable",
        rating_unplayable: "Injugable",
        rating_unsupported: "No compatible",
        rating_unknown: "Desconocido",
        compatibility_rating: "Clasificación",
        recommended_oc_mode: "Modo OC recomendado",
        average_fps: "FPS promedio",
        recommended_proton: "Protón recomendado",
        launch_options: "Opciones de lanzamiento",
        extra_info: "Información adicional",
        submitted_by: "Enviado por",
        copy_to_clipboard: "Copiar al portapapeles",
        copied: "¡Copiado!",
        not_rated: "No clasificado",
        // Filters
        switch_model_filter: "Modelo de Switch",
        oc_mode_filter_label: "Modo OC",
        rating_filter_label: "Clasificación",
        // Errors
        error_loading_games: "No se pudieron cargar juegos",
        error_loading_wifi: "No se pudieron cargar redes Wi-Fi",
        error_loading_bluetooth: "No se pudieron cargar dispositivos Bluetooth",
        error_connection_failed: "Falló la conexión",
        error_wrong_password: "Contraseña incorrecta",
        error_timeout: "La operación ha caducado",
        error_permission_denied: "Permiso denegado",
        error_no_network: "Sin conexión de red",
        // Placeholders
        placeholder_soon: "¡Muy pronto!",
    },
};
let translations = defaultTranslations["en"];
function setLanguage(lang) {
    translations = defaultTranslations[lang] || defaultTranslations["en"];
}
function t(key) {
    return translations[key] || key;
}
function detectLanguage() {
    try {
        const steamLang = window.SteamClient?.System?.GetSystemLanguage?.();
        if (steamLang) {
            const langMap = {
                english: "en",
                russian: "ru",
                spanish: "es",
                french: "fr",
            };
            if (langMap[steamLang])
                return langMap[steamLang];
        }
    }
    catch (e) { }
    const browserLang = navigator.language.split("-")[0];
    if (browserLang in defaultTranslations)
        return browserLang;
    return "en";
}
// ---------- Translate Rating Helper ----------
function translateRating(rating) {
    const ratingMap = {
        Perfect: t("rating_perfect"),
        Playable: t("rating_playable"),
        Unplayable: t("rating_unplayable"),
        Unsupported: t("rating_unsupported"),
        Unknown: t("rating_unknown"),
    };
    return ratingMap[rating] || rating;
}

const Scrollable = SP_REACT.forwardRef(({ style, ...props }, ref) => {
    const mergedStyle = {
        height: "95vh",
        overflowY: "scroll",
        ...style,
    };
    return SP_JSX.jsx("div", { ref: ref, ...props, style: mergedStyle });
});

// ---------- Backend callables ----------
const setOcMode = callable("set_oc_mode");
const setFanMode = callable("set_fan_mode");
const getCurrentOcMode = callable("get_current_oc_mode");
const getCurrentFanMode = callable("get_current_fan_mode");
const startTegrastats = callable("start_tegrastats");
const getTegrastatsData = callable("get_tegrastats_data");
const setBrightness = callable("set_brightness");
const setVolume = callable("set_volume");
const getBrightness = callable("get_brightness");
const getVolume = callable("get_volume");
const runRebootHekate = callable("run_reboot_hekate");
const runSwitchDesktop = callable("run_switch_desktop");
const getCompatibilityData = callable("get_compatibility_data");
const getInstalledGames = callable("get_installed_games");
const getIconBase64 = callable("get_icon_base64");
const getWifiStatus = callable("get_wifi_status");
const scanWifiNetworks = callable("scan_wifi_networks");
const connectWifi = callable("connect_wifi");
const toggleWifi = callable("toggle_wifi");
// Bluetooth callables
callable("get_bluetooth_status");
callable("start_bluetooth_scan");
callable("stop_bluetooth_scan");
callable("get_discovered_devices");
callable("get_paired_devices");
callable("get_connected_devices");
callable("toggle_bluetooth");
callable("refresh_bluetooth");
callable("connect_bluetooth");
callable("disconnect_bluetooth");
callable("forget_bluetooth");
// Filter settings
const getSetting = callable("get_setting");
const setSetting = callable("set_setting");
const syncCompatibility = callable("sync_compatibility");
const OC_NAMES = {
    0: "Console", 1: "Handheld", 2: "OC CPU",
    3: "OC GPU", 4: "OC All", 5: "Perf All", 6: "Perf OC All",
};
const FAN_NAMES = {
    0: "Console", 1: "Handheld", 2: "Cool",
};
// ---------- Helper Functions ----------
async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch (err) {
            console.error("Clipboard API failed:", err);
        }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try {
        success = document.execCommand("copy");
    }
    catch (err) {
        console.error("execCommand copy failed:", err);
    }
    document.body.removeChild(textarea);
    return success;
}
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = SP_REACT.useState(value);
    SP_REACT.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}
function parseStoredArray(value, defaultValue) {
    if (!value || value === "")
        return defaultValue;
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length === 0)
            return defaultValue;
        return parsed;
    }
    catch {
        return defaultValue;
    }
}
// ---------- Quick View (QAM content) ----------
const QuickView = ({ onOpenSettings }) => {
    const [ocMode, setOcModeState] = SP_REACT.useState(0);
    const [fanMode, setFanModeState] = SP_REACT.useState(0);
    const [brightness, setBrightnessState] = SP_REACT.useState(50);
    const [volume, setVolumeState] = SP_REACT.useState(50);
    const [loading, setLoading] = SP_REACT.useState(true);
    const volumeDebounce = SP_REACT.useRef(null);
    const isDraggingVolume = SP_REACT.useRef(false);
    const lastSetVolumeRef = SP_REACT.useRef(-1);
    const volumeRef = SP_REACT.useRef(volume);
    SP_REACT.useEffect(() => { volumeRef.current = volume; }, [volume]);
    SP_REACT.useEffect(() => {
        const loadInitial = async () => {
            try {
                const [oc, fan, br, vol] = await Promise.all([
                    getCurrentOcMode(), getCurrentFanMode(), getBrightness(), getVolume(),
                ]);
                setOcModeState(oc);
                setFanModeState(fan);
                setBrightnessState(br);
                setVolumeState(vol);
            }
            catch (e) {
                console.error(e);
            }
            finally {
                setLoading(false);
            }
        };
        loadInitial();
        const volumePoll = setInterval(async () => {
            if (!isDraggingVolume.current) {
                try {
                    const currentVol = await getVolume();
                    if (currentVol !== volumeRef.current)
                        setVolumeState(currentVol);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }, 1000);
        return () => clearInterval(volumePoll);
    }, []);
    const handleOcChange = async (v) => { setOcModeState(v); try {
        await setOcMode(v);
    }
    catch (e) {
        console.error(e);
    } };
    const handleFanChange = async (v) => { setFanModeState(v); try {
        await setFanMode(v);
    }
    catch (e) {
        console.error(e);
    } };
    const handleBrightnessChange = async (v) => { setBrightnessState(v); try {
        await setBrightness(v);
    }
    catch (e) {
        console.error(e);
    } };
    const handleVolumeChange = (v) => {
        setVolumeState(v);
        if (volumeDebounce.current)
            clearTimeout(volumeDebounce.current);
        isDraggingVolume.current = true;
        volumeDebounce.current = setTimeout(async () => {
            if (lastSetVolumeRef.current !== v) {
                try {
                    await setVolume(v);
                    lastSetVolumeRef.current = v;
                }
                catch (e) {
                    console.error(e);
                }
            }
            isDraggingVolume.current = false;
        }, 500);
    };
    if (loading)
        return SP_JSX.jsx(DFL.PanelSection, { title: t("plugin_title"), children: SP_JSX.jsx("div", { children: t("loading") }) });
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("plugin_title"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("brightness")}: ${brightness}%`, value: brightness, min: 0, max: 100, step: 1, showValue: false, onChange: handleBrightnessChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("volume")}: ${volume}%`, value: volume, min: 0, max: 100, step: 1, showValue: false, onChange: handleVolumeChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("oc_mode")}: ${OC_NAMES[ocMode]}`, value: ocMode, min: 0, max: 6, step: 1, showValue: false, onChange: handleOcChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("fan_mode")}: ${FAN_NAMES[fanMode]}`, value: fanMode, min: 0, max: 2, step: 1, showValue: false, onChange: handleFanChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: onOpenSettings, children: [SP_JSX.jsx(FaCog, {}), " ", t("settings")] }) })] }));
};
// ---------- Subviews for SidebarNavigation ----------
const SystemView = () => {
    const [brightness, setBrightnessState] = SP_REACT.useState(50);
    const [volume, setVolumeState] = SP_REACT.useState(50);
    const [loading, setLoading] = SP_REACT.useState(true);
    const volumeDebounce = SP_REACT.useRef(null);
    const isDraggingVolume = SP_REACT.useRef(false);
    const lastSetVolumeRef = SP_REACT.useRef(-1);
    SP_REACT.useEffect(() => {
        Promise.all([getBrightness(), getVolume()]).then(([br, vol]) => {
            setBrightnessState(br);
            setVolumeState(vol);
            setLoading(false);
        });
    }, []);
    const handleBrightnessChange = async (v) => { setBrightnessState(v); await setBrightness(v); };
    const handleVolumeChange = (v) => {
        setVolumeState(v);
        if (volumeDebounce.current)
            clearTimeout(volumeDebounce.current);
        isDraggingVolume.current = true;
        volumeDebounce.current = setTimeout(async () => {
            if (lastSetVolumeRef.current !== v) {
                try {
                    await setVolume(v);
                    lastSetVolumeRef.current = v;
                }
                catch (e) {
                    console.error(e);
                }
            }
            isDraggingVolume.current = false;
        }, 500);
    };
    if (loading) {
        return SP_JSX.jsx("div", { style: { textAlign: "center", marginTop: "20px" }, children: SP_JSX.jsx(DFL.Spinner, { style: { width: "45px", height: "45px" } }) });
    }
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("tab_system"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("brightness")}: ${brightness}%`, value: brightness, min: 0, max: 100, step: 1, showValue: false, onChange: handleBrightnessChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("volume")}: ${volume}%`, value: volume, min: 0, max: 100, step: 1, showValue: false, onChange: handleVolumeChange }) })] }));
};
const TdpView = () => {
    const [ocMode, setOcModeState] = SP_REACT.useState(0);
    const [fanMode, setFanModeState] = SP_REACT.useState(0);
    const [temps, setTemps] = SP_REACT.useState({ cpu: "--", gpu: "--", battery: "--" });
    const [loading, setLoading] = SP_REACT.useState(true);
    SP_REACT.useEffect(() => {
        const load = async () => {
            try {
                const [oc, fan] = await Promise.all([getCurrentOcMode(), getCurrentFanMode()]);
                setOcModeState(oc);
                setFanModeState(fan);
                await startTegrastats();
                setLoading(false);
            }
            catch (e) {
                console.error(e);
            }
        };
        load();
        const interval = setInterval(async () => {
            try {
                setTemps(await getTegrastatsData());
            }
            catch (e) {
                console.error(e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);
    const handleOcChange = async (v) => { setOcModeState(v); await setOcMode(v); };
    const handleFanChange = async (v) => { setFanModeState(v); await setFanMode(v); };
    if (loading)
        return SP_JSX.jsx("div", { children: t("loading") });
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("tab_tdp"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { margin: "10px 0", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }, children: [SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-around", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }, children: [SP_JSX.jsx("span", { children: t("cpu") }), SP_JSX.jsx("span", { children: t("gpu") }), SP_JSX.jsx("span", { children: t("battery") })] }), SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-around", fontSize: "14px" }, children: [SP_JSX.jsxs("span", { children: [temps.cpu, "\u00B0C"] }), SP_JSX.jsxs("span", { children: [temps.gpu, "\u00B0C"] }), SP_JSX.jsxs("span", { children: [temps.battery, "\u00B0C"] })] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("tdp_mode")}: ${OC_NAMES[ocMode]}`, value: ocMode, min: 0, max: 6, step: 1, showValue: false, onChange: handleOcChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `${t("fan_mode_label")}: ${FAN_NAMES[fanMode]}`, value: fanMode, min: 0, max: 2, step: 1, showValue: false, onChange: handleFanChange }) })] }));
};
const UtilitiesView = ({ confirmHekate, setConfirmHekate, hekateTimeout, confirmDesktop, setConfirmDesktop, desktopTimeout }) => {
    const handleRebootHekateClick = () => {
        if (confirmHekate) {
            runRebootHekate().catch(e => console.error(e));
            setConfirmHekate(false);
            if (hekateTimeout.current)
                clearTimeout(hekateTimeout.current);
        }
        else {
            setConfirmHekate(true);
            if (hekateTimeout.current)
                clearTimeout(hekateTimeout.current);
            hekateTimeout.current = setTimeout(() => setConfirmHekate(false), 3000);
        }
    };
    const handleSwitchDesktopClick = () => {
        if (confirmDesktop) {
            runSwitchDesktop().catch(e => console.error(e));
            setConfirmDesktop(false);
            if (desktopTimeout.current)
                clearTimeout(desktopTimeout.current);
        }
        else {
            setConfirmDesktop(true);
            if (desktopTimeout.current)
                clearTimeout(desktopTimeout.current);
            desktopTimeout.current = setTimeout(() => setConfirmDesktop(false), 3000);
        }
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("tab_utilities"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: handleRebootHekateClick, children: confirmHekate ? t("confirm") : t("reboot_hekate") }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: handleSwitchDesktopClick, children: confirmDesktop ? t("confirm") : t("switch_desktop") }) })] }));
};
// ---------- Wi-Fi Views ----------
const WifiPasswordView = ({ ssid, onConnect, onCancel, isConnecting, error }) => {
    const [password, setPassword] = SP_REACT.useState("");
    const [showPassword, setShowPassword] = SP_REACT.useState(false);
    return (SP_JSX.jsx(DFL.PanelSection, { title: `${t("wifi_enter_password").replace("{ssid}", ssid)}`, children: SP_JSX.jsxs("div", { style: { padding: "8px" }, children: [SP_JSX.jsx(DFL.TextField, { value: password, onChange: (e) => setPassword(e.target.value), bIsPassword: !showPassword, style: { width: "100%", marginBottom: "8px" } }), SP_JSX.jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: "16px" }, children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setShowPassword(!showPassword), children: showPassword ? SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(FaEyeSlash, {}), " ", t("wifi_hide_password")] }) : SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(FaEye, {}), " ", t("wifi_show_password")] }) }) }), isConnecting && SP_JSX.jsx("div", { style: { textAlign: "center", marginBottom: "16px" }, children: SP_JSX.jsx(DFL.Spinner, { style: { width: "45px", height: "45px" } }) }), error && SP_JSX.jsx("div", { style: { color: "#e74c3c", textAlign: "center", marginBottom: "16px" }, children: error }), SP_JSX.jsx("div", { style: { width: "100%", marginBottom: "8px" }, children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => onConnect(password), disabled: isConnecting, children: t("wifi_connect") }) }), SP_JSX.jsx("div", { style: { width: "100%" }, children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: onCancel, disabled: isConnecting, children: t("back") }) })] }) }));
};
const WifiListView = ({ wifiEnabled, currentWifi, networks, scanning, connectingTo, connectError, onToggleWifi, onRefresh, onConnectClick, onConnectedClick }) => {
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("wifi_title"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: t("wifi_toggle"), checked: wifiEnabled, onChange: onToggleWifi }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: onRefresh, children: t("wifi_refresh") }) }), currentWifi ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: onConnectedClick, children: SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }, children: [SP_JSX.jsxs("span", { children: [SP_JSX.jsx(FaCheck, { style: { marginRight: "8px" } }), currentWifi] }), SP_JSX.jsx(FaWifi, {})] }) }) })) : (SP_JSX.jsx("div", { style: { textAlign: "center", color: "#aaa", margin: "8px 0" }, children: t("wifi_no_connection") })), SP_JSX.jsx("h3", { style: { margin: "12px 0 0" }, children: t("wifi_available_networks") }), scanning ? (SP_JSX.jsx("div", { style: { textAlign: "center", margin: "10px 0" }, children: SP_JSX.jsx(DFL.Spinner, { style: { width: "45px", height: "45px" } }) })) : (networks.map(net => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => onConnectClick(net.ssid, net.secured), disabled: connectingTo === net.ssid, children: SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }, children: [SP_JSX.jsx("span", { children: net.ssid }), SP_JSX.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [net.secured && SP_JSX.jsx(FaLock, {}), SP_JSX.jsx(FaWifi, {})] })] }) }) }, net.ssid)))), connectError && SP_JSX.jsx("div", { style: { color: "#e74c3c", marginTop: "8px", textAlign: "center" }, children: connectError })] }));
};
const WifiView = () => {
    const [wifiEnabled, setWifiEnabled] = SP_REACT.useState(true);
    const [currentWifi, setCurrentWifi] = SP_REACT.useState(null);
    const [networks, setNetworks] = SP_REACT.useState([]);
    const [scanning, setScanning] = SP_REACT.useState(false);
    const [connectingTo, setConnectingTo] = SP_REACT.useState(null);
    const [connectError, setConnectError] = SP_REACT.useState(null);
    const [passwordView, setPasswordView] = SP_REACT.useState(null);
    const [isConnecting, setIsConnecting] = SP_REACT.useState(false);
    const loadWifi = async () => {
        const status = await getWifiStatus();
        setWifiEnabled(status.enabled);
        setCurrentWifi(status.current_ssid);
        if (status.enabled) {
            setScanning(true);
            const nets = await scanWifiNetworks();
            setNetworks(nets);
            setScanning(false);
        }
        else {
            setNetworks([]);
        }
    };
    SP_REACT.useEffect(() => {
        loadWifi();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible")
                loadWifi();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                getWifiStatus().then(status => setCurrentWifi(status.current_ssid));
            }
        }, 8000);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);
    const handleToggleWifi = async () => {
        await toggleWifi();
        await loadWifi();
        setConnectError(null);
    };
    const handleRefresh = () => loadWifi();
    const connectWifiDirect = async (ssid, password) => {
        setIsConnecting(true);
        setConnectError(null);
        const result = await connectWifi(ssid, password);
        if (result.success) {
            await loadWifi();
            setPasswordView(null);
        }
        else {
            setConnectError(result.error === "wrong_password" ? t("wifi_wrong_password") : t("wifi_connection_failed"));
        }
        setIsConnecting(false);
        setConnectingTo(null);
    };
    const handleConnectClick = (ssid, secured) => {
        if (secured) {
            setPasswordView({ ssid });
        }
        else {
            setConnectingTo(ssid);
            connectWifiDirect(ssid);
        }
    };
    const openConnectedDialog = () => {
        if (currentWifi) {
            alert(`${t("wifi_connected")} ${currentWifi}\nMAC: XX:XX:XX:XX:XX:XX\nIP: 192.168.1.100`);
        }
    };
    if (passwordView) {
        return (SP_JSX.jsx(WifiPasswordView, { ssid: passwordView.ssid, onConnect: (password) => connectWifiDirect(passwordView.ssid, password), onCancel: () => setPasswordView(null), isConnecting: isConnecting, error: connectError }));
    }
    return (SP_JSX.jsx(WifiListView, { wifiEnabled: wifiEnabled, currentWifi: currentWifi, networks: networks, scanning: scanning, connectingTo: connectingTo, connectError: connectError, onToggleWifi: handleToggleWifi, onRefresh: handleRefresh, onConnectClick: handleConnectClick, onConnectedClick: openConnectedDialog }));
};
// ---------- Bluetooth View (temporarily disabled - coming soon) ----------
const BluetoothView = () => {
    return (SP_JSX.jsx(DFL.PanelSection, { title: t("bluetooth_title"), children: SP_JSX.jsx(DFL.Focusable, { focusWithinClassName: "gpfocuswithin", onActivate: () => { }, style: { width: "100%", margin: "4px 0" }, children: SP_JSX.jsxs("div", { style: {
                    textAlign: "center",
                    color: "#aaa",
                    padding: "40px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px"
                }, children: [SP_JSX.jsx(FaBluetooth, { size: 48, style: { opacity: 0.3 } }), SP_JSX.jsx("div", { style: { fontSize: "18px", fontWeight: "bold" }, children: t("placeholder_soon") }), SP_JSX.jsx("div", { style: { fontSize: "14px", opacity: 0.7 }, children: t("bluetooth_placeholder") })] }) }) }));
};
// ---------- Compatibility Components ----------
const CompatibilityDetailView = ({ game, onBack }) => {
    const sections = [
        { key: "rating", label: t("compatibility_rating") }, { key: "switch_model", label: t("switch_model") },
        { key: "oc_mode", label: t("recommended_oc_mode") }, { key: "avg_fps", label: t("average_fps") },
        { key: "proton_version", label: t("recommended_proton") }, { key: "launch_options", label: t("launch_options") },
        { key: "extra_info", label: t("extra_info") }, { key: "submitted_by", label: t("submitted_by") },
    ];
    const renderTextBlock = (label, content, isCode = false) => (SP_JSX.jsxs("div", { style: { marginBottom: "16px" }, children: [SP_JSX.jsx("div", { style: { fontWeight: "bold", marginBottom: "4px" }, children: label }), SP_JSX.jsx(DFL.Focusable, { focusWithinClassName: "gpfocuswithin", onActivate: () => { }, style: {
                    width: "100%",
                    margin: 0,
                    padding: 0,
                    userSelect: "text",
                    cursor: "text",
                }, children: SP_JSX.jsx("div", { style: {
                        backgroundColor: "rgba(255,255,255,0.05)",
                        padding: "8px",
                        borderRadius: "4px",
                        fontFamily: isCode ? "monospace" : "inherit",
                        whiteSpace: isCode ? "pre-wrap" : "normal",
                        wordBreak: "break-word",
                    }, children: content }) }), isCode && (SP_JSX.jsx("div", { style: { marginTop: "4px" }, children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => copyToClipboard(content), children: t("copy_to_clipboard") }) }))] }));
    return (SP_JSX.jsxs(DFL.PanelSection, { title: game.name, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: onBack, children: [SP_JSX.jsx(FaArrowLeft, {}), " ", t("back")] }) }), SP_JSX.jsx(Scrollable, { style: { height: "calc(100vh - 80px)", padding: "0 8px" }, children: sections.map(section => {
                    const value = game[section.key];
                    if (!value)
                        return null;
                    return renderTextBlock(section.label, section.key === "rating" ? translateRating(value) : value, section.key === "launch_options");
                }) })] }));
};
const CompatibilityListView = ({ compatGames, compatLoading, iconUrls, searchInput, setSearchInput, setShowFiltersView, showInstalledOnly, setShowInstalledOnly, onGameSelected, error }) => {
    const filteredGames = compatGames.filter(game => {
        if (!game.name.toLowerCase().includes(searchInput.toLowerCase()))
            return false;
        return true;
    });
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("compatibility_title"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setShowFiltersView(true), children: t("filters") }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: t("search_games"), value: searchInput, onChange: (e) => setSearchInput(e.target.value), style: { width: "100%" } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: t("show_installed_only"), checked: showInstalledOnly, onChange: () => setShowInstalledOnly(!showInstalledOnly) }) }), compatLoading ? (SP_JSX.jsx("div", { style: { textAlign: "center", marginTop: "20px" }, children: SP_JSX.jsx(DFL.Spinner, { style: { width: "45px", height: "45px" } }) })) : error ? (SP_JSX.jsx("div", { style: { textAlign: "center", color: "#e74c3c", padding: "20px" }, children: error })) : filteredGames.length === 0 ? (SP_JSX.jsx("div", { style: { textAlign: "center", color: "#aaa", padding: "20px" }, children: t("no_games_found") })) : (SP_JSX.jsx(Scrollable, { style: { height: "calc(100vh - 80px)", padding: "0 8px" }, children: filteredGames.map((game) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => onGameSelected(game), children: SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", width: "100%" }, children: [iconUrls[game.rating.toLowerCase()] && (SP_JSX.jsx("img", { src: iconUrls[game.rating.toLowerCase()], style: { width: "24px", height: "24px", flexShrink: 0 }, alt: game.rating })), SP_JSX.jsx("span", { style: { flex: 1, textAlign: "left" }, children: game.name })] }) }) }, game.name))) }))] }));
};
const FiltersView = ({ setShowFiltersView, allSwitchModels, selectedSwitchModels, toggleSwitchModel, allOcModes, selectedOcModes, toggleOcMode, allRatings, selectedRatings, toggleRating, handleSync, syncing }) => (SP_JSX.jsxs(DFL.PanelSection, { title: t("game_filters"), children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setShowFiltersView(false), children: [SP_JSX.jsx(FaArrowLeft, {}), " ", t("back")] }) }), SP_JSX.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "8px" }, children: [SP_JSX.jsx("h3", { children: t("switch_model_filter") }), allSwitchModels.map(model => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: model, checked: selectedSwitchModels.includes(model), onChange: () => toggleSwitchModel(model) }) }, model))), SP_JSX.jsx("h3", { children: t("oc_mode_filter_label") }), allOcModes.map(mode => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: mode, checked: selectedOcModes.includes(mode), onChange: () => toggleOcMode(mode) }) }, mode))), SP_JSX.jsx("h3", { children: t("rating_filter_label") }), allRatings.map(rating => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: rating, checked: selectedRatings.includes(rating), onChange: () => toggleRating(rating) }) }, rating))), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: handleSync, disabled: syncing, children: syncing ? t("syncing") : t("sync") }) })] })] }));
// ---------- Main SettingsPage ----------
const SettingsPage = () => {
    const [compatGames, setCompatGames] = SP_REACT.useState([]);
    const [compatLoading, setCompatLoading] = SP_REACT.useState(true);
    const [syncing, setSyncing] = SP_REACT.useState(false);
    const [iconUrls, setIconUrls] = SP_REACT.useState({});
    const [showFiltersView, setShowFiltersView] = SP_REACT.useState(false);
    const [searchInput, setSearchInput] = SP_REACT.useState("");
    const [showInstalledOnly, setShowInstalledOnly] = SP_REACT.useState(false);
    const [installedGames, setInstalledGames] = SP_REACT.useState([]);
    const [selectedSwitchModels, setSelectedSwitchModels] = SP_REACT.useState([]);
    const [selectedOcModes, setSelectedOcModes] = SP_REACT.useState([]);
    const [selectedRatings, setSelectedRatings] = SP_REACT.useState([]);
    const [selectedGame, setSelectedGame] = SP_REACT.useState(null);
    const [confirmHekate, setConfirmHekate] = SP_REACT.useState(false);
    const [confirmDesktop, setConfirmDesktop] = SP_REACT.useState(false);
    const [compatError, setCompatError] = SP_REACT.useState(null);
    const hekateTimeout = SP_REACT.useRef(null);
    const desktopTimeout = SP_REACT.useRef(null);
    const debouncedSearchTerm = useDebounce(searchInput, 2000);
    const isFirstLoad = SP_REACT.useRef(true);
    const allSwitchModels = ["Switch Lite", "Switch OLED", "Switch V1", "Switch V2"];
    const allOcModes = ["Console", "Handheld", "OC CPU", "OC GPU", "OC All", "Perf OC", "Perf OC All"];
    const allRatings = ["Perfect", "Playable", "Unplayable", "Unsupported", "Unknown"];
    SP_REACT.useEffect(() => {
        getInstalledGames().then(setInstalledGames).catch(e => console.error(e));
    }, []);
    SP_REACT.useEffect(() => {
        const loadFilters = async () => {
            const [swStr, ocStr, rtStr] = await Promise.all([
                getSetting("selectedSwitchModels"), getSetting("selectedOcModes"), getSetting("selectedRatings"),
            ]);
            setSelectedSwitchModels(parseStoredArray(swStr, [...allSwitchModels]));
            setSelectedOcModes(parseStoredArray(ocStr, [...allOcModes]));
            setSelectedRatings(parseStoredArray(rtStr, [...allRatings]));
            isFirstLoad.current = false;
        };
        loadFilters();
    }, []);
    SP_REACT.useEffect(() => { if (!isFirstLoad.current)
        setSetting("selectedSwitchModels", JSON.stringify(selectedSwitchModels)); }, [selectedSwitchModels]);
    SP_REACT.useEffect(() => { if (!isFirstLoad.current)
        setSetting("selectedOcModes", JSON.stringify(selectedOcModes)); }, [selectedOcModes]);
    SP_REACT.useEffect(() => { if (!isFirstLoad.current)
        setSetting("selectedRatings", JSON.stringify(selectedRatings)); }, [selectedRatings]);
    const toggleSwitchModel = (model) => { setSelectedSwitchModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]); };
    const toggleOcMode = (mode) => { setSelectedOcModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]); };
    const toggleRating = (rating) => { setSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]); };
    SP_REACT.useEffect(() => {
        const statuses = ["perfect", "playable", "unplayable", "unsupported", "unknown"];
        statuses.forEach(async (s) => {
            const url = await getIconBase64(s);
            setIconUrls(prev => ({ ...prev, [s]: url }));
        });
    }, []);
    SP_REACT.useEffect(() => {
        if (!selectedGame && !showFiltersView) {
            const load = async () => {
                setCompatLoading(true);
                setCompatError(null);
                try {
                    console.log("[Compat] Calling getCompatibilityData(true)");
                    const data = await getCompatibilityData(true);
                    console.log("[Compat] Received data:", data ? data.length : 0, "games");
                    setCompatGames(data);
                    if (!data || data.length === 0) {
                        setCompatError("No games loaded from CSV. Check network or file.");
                    }
                }
                catch (e) {
                    console.error("[Compat] Error loading games:", e);
                    setCompatError(`Failed to load games: ${e}`);
                }
                finally {
                    setCompatLoading(false);
                }
            };
            load();
        }
    }, [selectedGame, showFiltersView]);
    const filteredGames = compatGames.filter(game => {
        if (!game.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            return false;
        if (selectedSwitchModels.length > 0 && !selectedSwitchModels.includes(game.switch_model))
            return false;
        if (selectedOcModes.length > 0 && !selectedOcModes.includes(game.oc_mode))
            return false;
        if (selectedRatings.length > 0 && !selectedRatings.includes(game.rating))
            return false;
        if (showInstalledOnly && !installedGames.includes(game.name))
            return false;
        return true;
    });
    const handleSync = async () => {
        setSyncing(true);
        try {
            const success = await syncCompatibility();
            if (success) {
                const data = await getCompatibilityData(true);
                setCompatGames(data);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setSyncing(false);
        }
    };
    let compatibilityContent = null;
    if (selectedGame) {
        compatibilityContent = SP_JSX.jsx(CompatibilityDetailView, { game: selectedGame, onBack: () => setSelectedGame(null) });
    }
    else if (showFiltersView) {
        compatibilityContent = SP_JSX.jsx(FiltersView, { setShowFiltersView: setShowFiltersView, allSwitchModels: allSwitchModels, selectedSwitchModels: selectedSwitchModels, toggleSwitchModel: toggleSwitchModel, allOcModes: allOcModes, selectedOcModes: selectedOcModes, toggleOcMode: toggleOcMode, allRatings: allRatings, selectedRatings: selectedRatings, toggleRating: toggleRating, handleSync: handleSync, syncing: syncing });
    }
    else {
        compatibilityContent = SP_JSX.jsx(CompatibilityListView, { compatGames: filteredGames, compatLoading: compatLoading, iconUrls: iconUrls, searchInput: searchInput, setSearchInput: setSearchInput, setShowFiltersView: setShowFiltersView, showInstalledOnly: showInstalledOnly, setShowInstalledOnly: setShowInstalledOnly, onGameSelected: setSelectedGame, error: compatError });
    }
    const pages = [
        { title: t("tab_system"), content: SP_JSX.jsx(SystemView, {}), icon: SP_JSX.jsx(FaMicrochip, {}), route: "/nintendeck-settings/system" },
        { title: t("tab_wifi"), content: SP_JSX.jsx(WifiView, {}), icon: SP_JSX.jsx(FaWifi, {}), route: "/nintendeck-settings/wifi" },
        { title: t("tab_bluetooth"), content: SP_JSX.jsx(BluetoothView, {}), icon: SP_JSX.jsx(FaBluetooth, {}), route: "/nintendeck-settings/bluetooth" },
        { title: t("tab_tdp"), content: SP_JSX.jsx(TdpView, {}), icon: SP_JSX.jsx(FaPlug, {}), route: "/nintendeck-settings/tdp" },
        { title: t("tab_utilities"), content: SP_JSX.jsx(UtilitiesView, { confirmHekate: confirmHekate, setConfirmHekate: setConfirmHekate, hekateTimeout: hekateTimeout, confirmDesktop: confirmDesktop, setConfirmDesktop: setConfirmDesktop, desktopTimeout: desktopTimeout }), icon: SP_JSX.jsx(FaWrench, {}), route: "/nintendeck-settings/utilities" },
        { title: t("tab_compatibility"), content: compatibilityContent, icon: SP_JSX.jsx(FaQuestionCircle, {}), route: "/nintendeck-settings/compatibility" },
    ];
    SP_REACT.useEffect(() => {
        const handleBack = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                if (selectedGame)
                    setSelectedGame(null);
                else if (showFiltersView)
                    setShowFiltersView(false);
                else
                    DFL.Navigation.NavigateBack();
            }
        };
        window.addEventListener("keydown", handleBack);
        return () => window.removeEventListener("keydown", handleBack);
    }, [selectedGame, showFiltersView]);
    return (SP_JSX.jsx(DFL.SidebarNavigation, { title: "NintenDeck Settings", showTitle: true, pages: pages }));
};
// ---------- Plugin definition ----------
var index = definePlugin(() => {
    const lang = detectLanguage();
    setLanguage(lang);
    routerHook.addRoute("/nintendeck-settings", SettingsPage);
    console.log(`[NintenDeck] Route /nintendeck-settings registered`);
    return {
        name: "NintenDeck",
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "NintenDeck" }),
        content: SP_JSX.jsx(QuickView, { onOpenSettings: () => { DFL.Navigation.CloseSideMenus(); DFL.Navigation.Navigate("/nintendeck-settings"); } }),
        icon: SP_JSX.jsx(FaMicrochip, {}),
        onDismount: () => {
            routerHook.removeRoute("/nintendeck-settings");
            console.log("NintenDeck unloaded");
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
