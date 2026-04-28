const manifest = {"name":"Example Plugin"};
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
function FaMicrochip (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M416 48v416c0 26.51-21.49 48-48 48H144c-26.51 0-48-21.49-48-48V48c0-26.51 21.49-48 48-48h224c26.51 0 48 21.49 48 48zm96 58v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42V88h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zm0 96v12a6 6 0 0 1-6 6h-18v6a6 6 0 0 1-6 6h-42v-48h42a6 6 0 0 1 6 6v6h18a6 6 0 0 1 6 6zM30 376h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6zm0-96h42v48H30a6 6 0 0 1-6-6v-6H6a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6h18v-6a6 6 0 0 1 6-6z"},"child":[]}]})(props);
}

// Backend callables
const setOcMode = callable("set_oc_mode");
const setFanMode = callable("set_fan_mode");
const getCurrentOcMode = callable("get_current_oc_mode");
const getCurrentFanMode = callable("get_current_fan_mode");
const startTegrastats = callable("start_tegrastats");
const stopTegrastats = callable("stop_tegrastats");
const getTegrastatsData = callable("get_tegrastats_data");
const OC_NAMES = {
    0: "Console", 1: "Handheld", 2: "OC CPU",
    3: "OC GPU", 4: "OC All", 5: "Perf All", 6: "Perf OC All",
};
const FAN_NAMES = {
    0: "Console", 1: "Handheld", 2: "Cool",
};
const Content = () => {
    const [ocMode, setOcModeState] = SP_REACT.useState(0);
    const [fanMode, setFanModeState] = SP_REACT.useState(0);
    const [loading, setLoading] = SP_REACT.useState(true);
    const [temps, setTemps] = SP_REACT.useState({ cpu: "--", gpu: "--", battery: "--" });
    SP_REACT.useEffect(() => {
        const loadInitial = async () => {
            try {
                const [oc, fan] = await Promise.all([
                    getCurrentOcMode(),
                    getCurrentFanMode(),
                ]);
                setOcModeState(oc);
                setFanModeState(fan);
                await startTegrastats(); // start background process – does not block UI
            }
            catch (e) {
                console.error("Failed to load initial settings:", e);
            }
            finally {
                setLoading(false);
            }
        };
        loadInitial();
        // Poll temperatures every 3 seconds
        const interval = setInterval(async () => {
            try {
                const data = await getTegrastatsData();
                setTemps(data);
            }
            catch (e) {
                console.error("Failed to fetch temperatures:", e);
            }
        }, 3000);
        return () => {
            clearInterval(interval);
            stopTegrastats();
        };
    }, []);
    const handleOcChange = async (value) => {
        setOcModeState(value);
        try {
            await setOcMode(value);
        }
        catch (e) {
            console.error("Failed to set OC mode:", e);
        }
    };
    const handleFanChange = async (value) => {
        setFanModeState(value);
        try {
            await setFanMode(value);
        }
        catch (e) {
            console.error("Failed to set fan mode:", e);
        }
    };
    if (loading) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: "NintenDeck", children: SP_JSX.jsx("div", { children: "Loading NintenDeck..." }) }));
    }
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "TDP CONTROL", children: [SP_JSX.jsxs("div", { style: { margin: "10px 0", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }, children: [SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-around", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }, children: [SP_JSX.jsx("span", { children: "CPU" }), SP_JSX.jsx("span", { children: "GPU" }), SP_JSX.jsx("span", { children: "Battery" })] }), SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-around", fontSize: "14px" }, children: [SP_JSX.jsxs("span", { children: [temps.cpu, "\u00B0C"] }), SP_JSX.jsxs("span", { children: [temps.gpu, "\u00B0C"] }), SP_JSX.jsxs("span", { children: [temps.battery, "\u00B0C"] })] })] }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `OC Mode: ${OC_NAMES[ocMode]}`, value: ocMode, min: 0, max: 6, step: 1, showValue: false, onChange: handleOcChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `Fan Mode: ${FAN_NAMES[fanMode]}`, value: fanMode, min: 0, max: 2, step: 1, showValue: false, onChange: handleFanChange }) })] }));
};
var index = definePlugin(() => ({
    name: "NintenDeck",
    titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "NintenDeck" }),
    content: SP_JSX.jsx(Content, {}),
    icon: SP_JSX.jsx(FaMicrochip, {}),
    onDismount: () => console.log("NintenDeck unloaded"),
}));

export { index as default };
//# sourceMappingURL=index.js.map
