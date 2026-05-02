import { PanelSection, PanelSectionRow, SliderField, staticClasses } from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import { useState, useEffect } from "react";
import { FaMicrochip } from "react-icons/fa";

// Backend callables
const setOcMode = callable<[value: number], void>("set_oc_mode");
const setFanMode = callable<[value: number], void>("set_fan_mode");
const getCurrentOcMode = callable<[], number>("get_current_oc_mode");
const getCurrentFanMode = callable<[], number>("get_current_fan_mode");
const startTegrastats = callable<[], void>("start_tegrastats");
const stopTegrastats = callable<[], void>("stop_tegrastats");
const getTegrastatsData = callable<[], any>("get_tegrastats_data");
const setBrightness = callable<[value: number], void>("set_brightness");
const setVolume = callable<[value: number], void>("set_volume");
const getBrightness = callable<[], number>("get_brightness");
const getVolume = callable<[], number>("get_volume");

const OC_NAMES: Record<number, string> = {
  0: "Console", 1: "Handheld", 2: "OC CPU",
  3: "OC GPU", 4: "OC All", 5: "Perf All", 6: "Perf OC All",
};

const FAN_NAMES: Record<number, string> = {
  0: "Console", 1: "Handheld", 2: "Cool",
};

const Content = () => {
  const [ocMode, setOcModeState] = useState<number>(0);
  const [fanMode, setFanModeState] = useState<number>(0);
  const [brightness, setBrightnessState] = useState<number>(50);
  const [volume, setVolumeState] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [temps, setTemps] = useState({ cpu: "--", gpu: "--", battery: "--" });

  // Load all initial values and start background processes
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [oc, fan, br, vol] = await Promise.all([
          getCurrentOcMode(),
          getCurrentFanMode(),
          getBrightness(),
          getVolume(),
        ]);
        setOcModeState(oc);
        setFanModeState(fan);
        setBrightnessState(br);
        setVolumeState(vol);
        await startTegrastats(); // non‑blocking, starts background reader
      } catch (e) {
        console.error("Failed to load initial settings:", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();

    // Poll temperatures every 3 seconds
    const interval = setInterval(async () => {
      try {
        const data = await getTegrastatsData();
        setTemps(data);
      } catch (e) {
        console.error("Failed to fetch temperatures:", e);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      stopTegrastats();
    };
  }, []);

  const handleOcChange = async (value: number) => {
    setOcModeState(value);
    try {
      await setOcMode(value);
    } catch (e) {
      console.error("Failed to set OC mode:", e);
    }
  };

  const handleFanChange = async (value: number) => {
    setFanModeState(value);
    try {
      await setFanMode(value);
    } catch (e) {
      console.error("Failed to set fan mode:", e);
    }
  };

  const handleBrightnessChange = async (value: number) => {
    setBrightnessState(value);
    try {
      await setBrightness(value);
    } catch (e) {
      console.error("Failed to set brightness:", e);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolumeState(value);
    try {
      await setVolume(value);
    } catch (e) {
      console.error("Failed to set volume:", e);
    }
  };

  if (loading) {
    return (
      <PanelSection title="NintenDeck">
        <div>Loading NintenDeck...</div>
      </PanelSection>
    );
  }

  return (
    <>
      {/* SYSTEM section (brightness + volume) */}
      <PanelSection title="SYSTEM">
        <PanelSectionRow>
          <SliderField
            label={`Brightness: ${brightness}%`}
            value={brightness}
            min={0}
            max={100}
            step={1}
            showValue={false}
            onChange={handleBrightnessChange}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={`Volume: ${volume}%`}
            value={volume}
            min={0}
            max={100}
            step={1}
            showValue={false}
            onChange={handleVolumeChange}
          />
        </PanelSectionRow>
      </PanelSection>

      {/* TDP CONTROL section (OC, fan, temperatures) */}
      <PanelSection title="TDP CONTROL">
        {/* Temperature display – two rows */}
        <div style={{ margin: "10px 0", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>
            <span>CPU</span>
            <span>GPU</span>
            <span>Battery</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: "14px" }}>
            <span>{temps.cpu}°C</span>
            <span>{temps.gpu}°C</span>
            <span>{temps.battery}°C</span>
          </div>
        </div>

        <PanelSectionRow>
          <SliderField
            label={`OC Mode: ${OC_NAMES[ocMode]}`}
            value={ocMode}
            min={0}
            max={6}
            step={1}
            showValue={false}
            onChange={handleOcChange}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <SliderField
            label={`Fan Mode: ${FAN_NAMES[fanMode]}`}
            value={fanMode}
            min={0}
            max={2}
            step={1}
            showValue={false}
            onChange={handleFanChange}
          />
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin(() => ({
  name: "NintenDeck",
  titleView: <div className={staticClasses.Title}>NintenDeck</div>,
  content: <Content />,
  icon: <FaMicrochip />,
  onDismount: () => console.log("NintenDeck unloaded"),
}));
