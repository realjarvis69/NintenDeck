import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  staticClasses,
  ButtonItem,
  ToggleField,
  Focusable,
  TextField,
  Spinner,
  SidebarNavigation,
  Navigation,
} from "@decky/ui";
import { callable, definePlugin, routerHook } from "@decky/api";
import React, { useState, useEffect, useRef } from "react";
import { FaMicrochip, FaArrowLeft, FaCog, FaWifi, FaLock, FaCheck, FaPlug, FaWrench, FaQuestionCircle, FaEye, FaEyeSlash, FaBluetooth } from "react-icons/fa";
import { t, setLanguage, detectLanguage, translateRating } from "./lib/i18n";
import { Scrollable } from "./components/Scrollable";

// ---------- Types ----------
interface GameEntry {
  name: string;
  switch_model: string;
  oc_mode: string;
  rating: string;
  avg_fps: string;
  proton_version: string;
  launch_options: string;
  extra_info: string;
  submitted_by: string;
}

interface WifiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}

interface BluetoothDevice {
  mac: string;
  name: string;
  paired: boolean;
  connected: boolean;
}

// ---------- Backend callables ----------
const setOcMode = callable<[value: number], void>("set_oc_mode");
const setFanMode = callable<[value: number], void>("set_fan_mode");
const getCurrentOcMode = callable<[], number>("get_current_oc_mode");
const getCurrentFanMode = callable<[], number>("get_current_fan_mode");
const startTegrastats = callable<[], void>("start_tegrastats");
const getTegrastatsData = callable<[], any>("get_tegrastats_data");
const setBrightness = callable<[value: number], void>("set_brightness");
const setVolume = callable<[value: number], void>("set_volume");
const getBrightness = callable<[], number>("get_brightness");
const getVolume = callable<[], number>("get_volume");
const runRebootHekate = callable<[], void>("run_reboot_hekate");
const runSwitchDesktop = callable<[], void>("run_switch_desktop");
const getCompatibilityData = callable<[showAll: boolean], GameEntry[]>("get_compatibility_data");
const getInstalledGames = callable<[], string[]>("get_installed_games");
const getIconBase64 = callable<[status: string], string>("get_icon_base64");
const getWifiStatus = callable<[], { enabled: boolean; current_ssid: string | null }>("get_wifi_status");
const scanWifiNetworks = callable<[], WifiNetwork[]>("scan_wifi_networks");
const connectWifi = callable<[ssid: string, password?: string], { success: boolean; error?: string }>("connect_wifi");
const toggleWifi = callable<[], boolean>("toggle_wifi");
// Bluetooth callables
const getBluetoothStatus = callable<[], { enabled: boolean }>("get_bluetooth_status");
const startBluetoothScan = callable<[], void>("start_bluetooth_scan");
const stopBluetoothScan = callable<[], void>("stop_bluetooth_scan");
const getDiscoveredDevices = callable<[], BluetoothDevice[]>("get_discovered_devices");
const getPairedDevices = callable<[], BluetoothDevice[]>("get_paired_devices");
const getConnectedDevices = callable<[], BluetoothDevice[]>("get_connected_devices");
const toggleBluetooth = callable<[], boolean>("toggle_bluetooth");
const refreshBluetooth = callable<[], void>("refresh_bluetooth");
const connectBluetooth = callable<[mac: string], boolean>("connect_bluetooth");
const disconnectBluetooth = callable<[mac: string], boolean>("disconnect_bluetooth");
const forgetBluetooth = callable<[mac: string], boolean>("forget_bluetooth");
// Filter settings
const getSetting = callable<[key: string], string>("get_setting");
const setSetting = callable<[key: string, value: string], void>("set_setting");
const syncCompatibility = callable<[], boolean>("sync_compatibility");

const OC_NAMES: Record<number, string> = {
  0: "Console", 1: "Handheld", 2: "OC CPU",
  3: "OC GPU", 4: "OC All", 5: "Perf All", 6: "Perf OC All",
};
const FAN_NAMES: Record<number, string> = {
  0: "Console", 1: "Handheld", 2: "Cool",
};

// ---------- Helper Functions ----------
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) { console.error("Clipboard API failed:", err); }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try { success = document.execCommand("copy"); } catch (err) { console.error("execCommand copy failed:", err); }
  document.body.removeChild(textarea);
  return success;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function parseStoredArray(value: string, defaultValue: string[]): string[] {
  if (!value || value === "") return defaultValue;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length === 0) return defaultValue;
    return parsed;
  } catch { return defaultValue; }
}

// ---------- Quick View (QAM content) ----------
const QuickView: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const [ocMode, setOcModeState] = useState<number>(0);
  const [fanMode, setFanModeState] = useState<number>(0);
  const [brightness, setBrightnessState] = useState<number>(50);
  const [volume, setVolumeState] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const volumeDebounce = useRef<NodeJS.Timeout | null>(null);
  const isDraggingVolume = useRef<boolean>(false);
  const lastSetVolumeRef = useRef<number>(-1);
  const volumeRef = useRef<number>(volume);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [oc, fan, br, vol] = await Promise.all([
          getCurrentOcMode(), getCurrentFanMode(), getBrightness(), getVolume(),
        ]);
        setOcModeState(oc); setFanModeState(fan); setBrightnessState(br); setVolumeState(vol);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadInitial();
    const volumePoll = setInterval(async () => {
      if (!isDraggingVolume.current) {
        try {
          const currentVol = await getVolume();
          if (currentVol !== volumeRef.current) setVolumeState(currentVol);
        } catch (e) { console.error(e); }
      }
    }, 1000);
    return () => clearInterval(volumePoll);
  }, []);

  const handleOcChange = async (v: number) => { setOcModeState(v); try { await setOcMode(v); } catch(e) { console.error(e); } };
  const handleFanChange = async (v: number) => { setFanModeState(v); try { await setFanMode(v); } catch(e) { console.error(e); } };
  const handleBrightnessChange = async (v: number) => { setBrightnessState(v); try { await setBrightness(v); } catch(e) { console.error(e); } };
  const handleVolumeChange = (v: number) => {
    setVolumeState(v);
    if (volumeDebounce.current) clearTimeout(volumeDebounce.current);
    isDraggingVolume.current = true;
    volumeDebounce.current = setTimeout(async () => {
      if (lastSetVolumeRef.current !== v) {
        try { await setVolume(v); lastSetVolumeRef.current = v; } catch(e) { console.error(e); }
      }
      isDraggingVolume.current = false;
    }, 500);
  };

  if (loading) return <PanelSection title={t("plugin_title")}><div>{t("loading")}</div></PanelSection>;

  return (
    <PanelSection title={t("plugin_title")}>
      <PanelSectionRow><SliderField label={`${t("brightness")}: ${brightness}%`} value={brightness} min={0} max={100} step={1} showValue={false} onChange={handleBrightnessChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("volume")}: ${volume}%`} value={volume} min={0} max={100} step={1} showValue={false} onChange={handleVolumeChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("oc_mode")}: ${OC_NAMES[ocMode]}`} value={ocMode} min={0} max={6} step={1} showValue={false} onChange={handleOcChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("fan_mode")}: ${FAN_NAMES[fanMode]}`} value={fanMode} min={0} max={2} step={1} showValue={false} onChange={handleFanChange} /></PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onOpenSettings}><FaCog /> {t("settings")}</ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

// ---------- Subviews for SidebarNavigation ----------
const SystemView: React.FC = () => {
  const [brightness, setBrightnessState] = useState<number>(50);
  const [volume, setVolumeState] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const volumeDebounce = useRef<NodeJS.Timeout | null>(null);
  const isDraggingVolume = useRef<boolean>(false);
  const lastSetVolumeRef = useRef<number>(-1);

  useEffect(() => {
    Promise.all([getBrightness(), getVolume()]).then(([br, vol]) => {
      setBrightnessState(br);
      setVolumeState(vol);
      setLoading(false);
    });
  }, []);

  const handleBrightnessChange = async (v: number) => { setBrightnessState(v); await setBrightness(v); };
  const handleVolumeChange = (v: number) => {
    setVolumeState(v);
    if (volumeDebounce.current) clearTimeout(volumeDebounce.current);
    isDraggingVolume.current = true;
    volumeDebounce.current = setTimeout(async () => {
      if (lastSetVolumeRef.current !== v) {
        try { await setVolume(v); lastSetVolumeRef.current = v; } catch(e) { console.error(e); }
      }
      isDraggingVolume.current = false;
    }, 500);
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "20px" }}><Spinner style={{ width: "45px", height: "45px" }} /></div>;
  }

  return (
    <PanelSection title={t("tab_system")}>
      <PanelSectionRow><SliderField label={`${t("brightness")}: ${brightness}%`} value={brightness} min={0} max={100} step={1} showValue={false} onChange={handleBrightnessChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("volume")}: ${volume}%`} value={volume} min={0} max={100} step={1} showValue={false} onChange={handleVolumeChange} /></PanelSectionRow>
    </PanelSection>
  );
};

const TdpView: React.FC = () => {
  const [ocMode, setOcModeState] = useState<number>(0);
  const [fanMode, setFanModeState] = useState<number>(0);
  const [temps, setTemps] = useState({ cpu: "--", gpu: "--", battery: "--" });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const [oc, fan] = await Promise.all([getCurrentOcMode(), getCurrentFanMode()]);
        setOcModeState(oc); setFanModeState(fan);
        await startTegrastats();
        setLoading(false);
      } catch (e) { console.error(e); }
    };
    load();
    const interval = setInterval(async () => {
      try { setTemps(await getTegrastatsData()); } catch (e) { console.error(e); }
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const handleOcChange = async (v: number) => { setOcModeState(v); await setOcMode(v); };
  const handleFanChange = async (v: number) => { setFanModeState(v); await setFanMode(v); };
  if (loading) return <div>{t("loading")}</div>;
  return (
    <PanelSection title={t("tab_tdp")}>
      <PanelSectionRow>
        <div style={{ margin: "10px 0", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>
            <span>{t("cpu")}</span><span>{t("gpu")}</span><span>{t("battery")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", fontSize: "14px" }}>
            <span>{temps.cpu}°C</span><span>{temps.gpu}°C</span><span>{temps.battery}°C</span>
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("tdp_mode")}: ${OC_NAMES[ocMode]}`} value={ocMode} min={0} max={6} step={1} showValue={false} onChange={handleOcChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("fan_mode_label")}: ${FAN_NAMES[fanMode]}`} value={fanMode} min={0} max={2} step={1} showValue={false} onChange={handleFanChange} /></PanelSectionRow>
    </PanelSection>
  );
};

const UtilitiesView: React.FC<{
  confirmHekate: boolean;
  setConfirmHekate: (v: boolean) => void;
  hekateTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
}> = ({ confirmHekate, setConfirmHekate, hekateTimeout }) => {
  const handleRebootHekateClick = () => {
    if (confirmHekate) {
      runRebootHekate().catch(e => console.error(e));
      setConfirmHekate(false);
      if (hekateTimeout.current) clearTimeout(hekateTimeout.current);
    } else {
      setConfirmHekate(true);
      if (hekateTimeout.current) clearTimeout(hekateTimeout.current);
      hekateTimeout.current = setTimeout(() => setConfirmHekate(false), 3000);
    }
  };
  return (
    <PanelSection title={t("tab_utilities")}>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={handleRebootHekateClick}>
          {confirmHekate ? t("confirm") : t("reboot_hekate")}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

// ---------- Wi-Fi Views ----------
const WifiPasswordView: React.FC<{
  ssid: string;
  onConnect: (password: string) => void;
  onCancel: () => void;
  isConnecting: boolean;
  error: string | null;
}> = ({ ssid, onConnect, onCancel, isConnecting, error }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <PanelSection title={`${t("wifi_enter_password").replace("{ssid}", ssid)}`}>
      <div style={{ padding: "8px" }}>
        <TextField
          value={password}
          onChange={(e: any) => setPassword(e.target.value)}
          bIsPassword={!showPassword}
          style={{ width: "100%", marginBottom: "8px" }}
        />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <ButtonItem layout="below" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <><FaEyeSlash /> {t("wifi_hide_password")}</> : <><FaEye /> {t("wifi_show_password")}</>}
          </ButtonItem>
        </div>
        {isConnecting && <div style={{ textAlign: "center", marginBottom: "16px" }}><Spinner style={{ width: "45px", height: "45px" }} /></div>}
        {error && <div style={{ color: "#e74c3c", textAlign: "center", marginBottom: "16px" }}>{error}</div>}
        <div style={{ width: "100%", marginBottom: "8px" }}>
          <ButtonItem layout="below" onClick={() => onConnect(password)} disabled={isConnecting}>
            {t("wifi_connect")}
          </ButtonItem>
        </div>
        <div style={{ width: "100%" }}>
          <ButtonItem layout="below" onClick={onCancel} disabled={isConnecting}>
            {t("back")}
          </ButtonItem>
        </div>
      </div>
    </PanelSection>
  );
};

const WifiListView: React.FC<{
  wifiEnabled: boolean;
  currentWifi: string | null;
  networks: WifiNetwork[];
  scanning: boolean;
  connectingTo: string | null;
  connectError: string | null;
  onToggleWifi: () => void;
  onRefresh: () => void;
  onConnectClick: (ssid: string, secured: boolean) => void;
  onConnectedClick: () => void;
}> = ({ wifiEnabled, currentWifi, networks, scanning, connectingTo, connectError,
        onToggleWifi, onRefresh, onConnectClick, onConnectedClick }) => {
  return (
    <PanelSection title={t("wifi_title")}>
      <PanelSectionRow><ToggleField label={t("wifi_toggle")} checked={wifiEnabled} onChange={onToggleWifi} /></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" onClick={onRefresh}>{t("wifi_refresh")}</ButtonItem></PanelSectionRow>
      {currentWifi ? (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onConnectedClick}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span><FaCheck style={{ marginRight: "8px" }} />{currentWifi}</span>
              <FaWifi />
            </div>
          </ButtonItem>
        </PanelSectionRow>
      ) : (
        <div style={{ textAlign: "center", color: "#aaa", margin: "8px 0" }}>{t("wifi_no_connection")}</div>
      )}
      <h3 style={{ margin: "12px 0 0" }}>{t("wifi_available_networks")}</h3>
      {scanning ? (
        <div style={{ textAlign: "center", margin: "10px 0" }}><Spinner style={{ width: "45px", height: "45px" }} /></div>
      ) : (
        networks.map(net => (
          <PanelSectionRow key={net.ssid}>
            <ButtonItem
              layout="below"
              onClick={() => onConnectClick(net.ssid, net.secured)}
              disabled={connectingTo === net.ssid}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span>{net.ssid}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {net.secured && <FaLock />}
                  <FaWifi />
                </div>
              </div>
            </ButtonItem>
          </PanelSectionRow>
        ))
      )}
      {connectError && <div style={{ color: "#e74c3c", marginTop: "8px", textAlign: "center" }}>{connectError}</div>}
    </PanelSection>
  );
};

const WifiView: React.FC = () => {
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [currentWifi, setCurrentWifi] = useState<string | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [passwordView, setPasswordView] = useState<{ ssid: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadWifi = async () => {
    const status = await getWifiStatus();
    setWifiEnabled(status.enabled);
    setCurrentWifi(status.current_ssid);
    if (status.enabled) {
      setScanning(true);
      const nets = await scanWifiNetworks();
      setNetworks(nets);
      setScanning(false);
    } else {
      setNetworks([]);
    }
  };

  useEffect(() => {
    loadWifi();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadWifi();
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

  const connectWifiDirect = async (ssid: string, password?: string) => {
    setIsConnecting(true);
    setConnectError(null);
    const result = await connectWifi(ssid, password);
    if (result.success) {
      await loadWifi();
      setPasswordView(null);
    } else {
      setConnectError(result.error === "wrong_password" ? t("wifi_wrong_password") : t("wifi_connection_failed"));
    }
    setIsConnecting(false);
    setConnectingTo(null);
  };

  const handleConnectClick = (ssid: string, secured: boolean) => {
    if (secured) {
      setPasswordView({ ssid });
    } else {
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
    return (
      <WifiPasswordView
        ssid={passwordView.ssid}
        onConnect={(password) => connectWifiDirect(passwordView.ssid, password)}
        onCancel={() => setPasswordView(null)}
        isConnecting={isConnecting}
        error={connectError}
      />
    );
  }

  return (
    <WifiListView
      wifiEnabled={wifiEnabled}
      currentWifi={currentWifi}
      networks={networks}
      scanning={scanning}
      connectingTo={connectingTo}
      connectError={connectError}
      onToggleWifi={handleToggleWifi}
      onRefresh={handleRefresh}
      onConnectClick={handleConnectClick}
      onConnectedClick={openConnectedDialog}
    />
  );
};

// ---------- Bluetooth View (temporarily disabled - coming soon) ----------
const BluetoothView: React.FC = () => {
  return (
    <PanelSection title={t("bluetooth_title")}>
      <Focusable
        focusWithinClassName="gpfocuswithin"
        onActivate={() => {}}
        style={{ width: "100%", margin: "4px 0" }}
      >
        <div style={{
          textAlign: "center",
          color: "#aaa",
          padding: "40px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px"
        }}>
          <FaBluetooth size={48} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>
            {t("placeholder_soon")}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.7 }}>
            {t("bluetooth_placeholder")}
          </div>
        </div>
      </Focusable>
    </PanelSection>
  );
};

// ---------- Compatibility Components ----------
const CompatibilityDetailView: React.FC<{
  game: GameEntry;
  onBack: () => void;
}> = ({ game, onBack }) => {
  const sections = [
    { key: "rating", label: t("compatibility_rating") }, { key: "switch_model", label: t("switch_model") },
    { key: "oc_mode", label: t("recommended_oc_mode") }, { key: "avg_fps", label: t("average_fps") },
    { key: "proton_version", label: t("recommended_proton") }, { key: "launch_options", label: t("launch_options") },
    { key: "extra_info", label: t("extra_info") }, { key: "submitted_by", label: t("submitted_by") },
  ];

  const renderTextBlock = (label: string, content: string, isCode: boolean = false) => (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{label}</div>
      <Focusable
        focusWithinClassName="gpfocuswithin"
        onActivate={() => {}}
        style={{
          width: "100%",
          margin: 0,
          padding: 0,
          userSelect: "text",
          cursor: "text",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: isCode ? "monospace" : "inherit",
            whiteSpace: isCode ? "pre-wrap" : "normal",
            wordBreak: "break-word",
          }}
        >
          {content}
        </div>
      </Focusable>
      {isCode && (
        <div style={{ marginTop: "4px" }}>
          <ButtonItem layout="below" onClick={() => copyToClipboard(content)}>{t("copy_to_clipboard")}</ButtonItem>
        </div>
      )}
    </div>
  );

  return (
    <PanelSection title={game.name}>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onBack}><FaArrowLeft /> {t("back")}</ButtonItem>
      </PanelSectionRow>
      <Scrollable style={{ height: "calc(100vh - 80px)", padding: "0 8px" }}>
        {sections.map(section => {
          const value = game[section.key as keyof GameEntry];
          if (!value) return null;
          return renderTextBlock(
            section.label,
            section.key === "rating" ? translateRating(value) : value,
            section.key === "launch_options"
          );
        })}
      </Scrollable>
    </PanelSection>
  );
};

const CompatibilityListView: React.FC<{
  compatGames: GameEntry[];
  compatLoading: boolean;
  iconUrls: Record<string, string>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  setShowFiltersView: (v: boolean) => void;
  showInstalledOnly: boolean;
  setShowInstalledOnly: (v: boolean) => void;
  onGameSelected: (game: GameEntry) => void;
  error: string | null;
}> = ({ compatGames, compatLoading, iconUrls, searchInput, setSearchInput,
        setShowFiltersView, showInstalledOnly, setShowInstalledOnly, onGameSelected, error }) => {
  const filteredGames = compatGames.filter(game => {
    if (!game.name.toLowerCase().includes(searchInput.toLowerCase())) return false;
    return true;
  });

  return (
    <PanelSection title={t("compatibility_title")}>
      <PanelSectionRow><ButtonItem layout="below" onClick={() => setShowFiltersView(true)}>{t("filters")}</ButtonItem></PanelSectionRow>
      <PanelSectionRow><TextField label={t("search_games")} value={searchInput} onChange={(e: any) => setSearchInput(e.target.value)} style={{ width: "100%" }} /></PanelSectionRow>
      <PanelSectionRow><ToggleField label={t("show_installed_only")} checked={showInstalledOnly} onChange={() => setShowInstalledOnly(!showInstalledOnly)} /></PanelSectionRow>
      {compatLoading ? (
        <div style={{ textAlign: "center", marginTop: "20px" }}><Spinner style={{ width: "45px", height: "45px" }} /></div>
      ) : error ? (
        <div style={{ textAlign: "center", color: "#e74c3c", padding: "20px" }}>{error}</div>
      ) : filteredGames.length === 0 ? (
        <div style={{ textAlign: "center", color: "#aaa", padding: "20px" }}>{t("no_games_found")}</div>
      ) : (
        <Scrollable style={{ height: "calc(100vh - 80px)", padding: "0 8px" }}>
          {filteredGames.map((game) => (
            <PanelSectionRow key={game.name}>
              <ButtonItem layout="below" onClick={() => onGameSelected(game)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  {iconUrls[game.rating.toLowerCase()] && (
                    <img
                      src={iconUrls[game.rating.toLowerCase()]}
                      style={{ width: "24px", height: "24px", flexShrink: 0 }}
                      alt={game.rating}
                    />
                  )}
                  <span style={{ flex: 1, textAlign: "left" }}>{game.name}</span>
                </div>
              </ButtonItem>
            </PanelSectionRow>
          ))}
        </Scrollable>
      )}
    </PanelSection>
  );
};

const FiltersView: React.FC<{
  setShowFiltersView: (v: boolean) => void;
  allSwitchModels: string[]; selectedSwitchModels: string[]; toggleSwitchModel: (v: string) => void;
  allOcModes: string[]; selectedOcModes: string[]; toggleOcMode: (v: string) => void;
  allRatings: string[]; selectedRatings: string[]; toggleRating: (v: string) => void;
  handleSync: () => void; syncing: boolean;
}> = ({ setShowFiltersView, allSwitchModels, selectedSwitchModels, toggleSwitchModel,
        allOcModes, selectedOcModes, toggleOcMode,
        allRatings, selectedRatings, toggleRating,
        handleSync, syncing }) => (
  <PanelSection title={t("game_filters")}>
    <PanelSectionRow><ButtonItem layout="below" onClick={() => setShowFiltersView(false)}><FaArrowLeft /> {t("back")}</ButtonItem></PanelSectionRow>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px" }}>
      <h3>{t("switch_model_filter")}</h3>
      {allSwitchModels.map(model => (<PanelSectionRow key={model}><ToggleField label={model} checked={selectedSwitchModels.includes(model)} onChange={() => toggleSwitchModel(model)} /></PanelSectionRow>))}
      <h3>{t("oc_mode_filter_label")}</h3>
      {allOcModes.map(mode => (<PanelSectionRow key={mode}><ToggleField label={mode} checked={selectedOcModes.includes(mode)} onChange={() => toggleOcMode(mode)} /></PanelSectionRow>))}
      <h3>{t("rating_filter_label")}</h3>
      {allRatings.map(rating => (<PanelSectionRow key={rating}><ToggleField label={rating} checked={selectedRatings.includes(rating)} onChange={() => toggleRating(rating)} /></PanelSectionRow>))}
      <PanelSectionRow><ButtonItem layout="below" onClick={handleSync} disabled={syncing}>{syncing ? t("syncing") : t("sync")}</ButtonItem></PanelSectionRow>
    </div>
  </PanelSection>
);

// ---------- Main SettingsPage ----------
const SettingsPage: React.FC = () => {
  const [compatGames, setCompatGames] = useState<GameEntry[]>([]);
  const [compatLoading, setCompatLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [showFiltersView, setShowFiltersView] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>("");
  const [showInstalledOnly, setShowInstalledOnly] = useState<boolean>(false);
  const [installedGames, setInstalledGames] = useState<string[]>([]);
  const [selectedSwitchModels, setSelectedSwitchModels] = useState<string[]>([]);
  const [selectedOcModes, setSelectedOcModes] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameEntry | null>(null);
  const [confirmHekate, setConfirmHekate] = useState<boolean>(false);
  const [confirmDesktop, setConfirmDesktop] = useState<boolean>(false);
  const [compatError, setCompatError] = useState<string | null>(null);
  const hekateTimeout = useRef<NodeJS.Timeout | null>(null);
  const desktopTimeout = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearchTerm = useDebounce(searchInput, 2000);
  const isFirstLoad = useRef<boolean>(true);

  const allSwitchModels = ["Switch Lite", "Switch OLED", "Switch V1", "Switch V2"];
  const allOcModes = ["Console", "Handheld", "OC CPU", "OC GPU", "OC All", "Perf OC", "Perf OC All"];
  const allRatings = ["Perfect", "Playable", "Unplayable", "Unsupported", "Unknown"];

  useEffect(() => {
    getInstalledGames().then(setInstalledGames).catch(e => console.error(e));
  }, []);

  useEffect(() => {
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

  useEffect(() => { if (!isFirstLoad.current) setSetting("selectedSwitchModels", JSON.stringify(selectedSwitchModels)); }, [selectedSwitchModels]);
  useEffect(() => { if (!isFirstLoad.current) setSetting("selectedOcModes", JSON.stringify(selectedOcModes)); }, [selectedOcModes]);
  useEffect(() => { if (!isFirstLoad.current) setSetting("selectedRatings", JSON.stringify(selectedRatings)); }, [selectedRatings]);

  const toggleSwitchModel = (model: string) => { setSelectedSwitchModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]); };
  const toggleOcMode = (mode: string) => { setSelectedOcModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]); };
  const toggleRating = (rating: string) => { setSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]); };

  useEffect(() => {
    const statuses = ["perfect", "playable", "unplayable", "unsupported", "unknown"];
    statuses.forEach(async (s) => {
      const url = await getIconBase64(s);
      setIconUrls(prev => ({ ...prev, [s]: url }));
    });
  }, []);

  useEffect(() => {
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
        } catch (e) {
          console.error("[Compat] Error loading games:", e);
          setCompatError(`Failed to load games: ${e}`);
        } finally {
          setCompatLoading(false);
        }
      };
      load();
    }
  }, [selectedGame, showFiltersView]);

  const filteredGames = compatGames.filter(game => {
    if (!game.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) return false;
    if (selectedSwitchModels.length > 0 && !selectedSwitchModels.includes(game.switch_model)) return false;
    if (selectedOcModes.length > 0 && !selectedOcModes.includes(game.oc_mode)) return false;
    if (selectedRatings.length > 0 && !selectedRatings.includes(game.rating)) return false;
    if (showInstalledOnly && !installedGames.includes(game.name)) return false;
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
    } catch(e) { console.error(e); } finally { setSyncing(false); }
  };

  let compatibilityContent: React.ReactNode = null;
  if (selectedGame) {
    compatibilityContent = <CompatibilityDetailView game={selectedGame} onBack={() => setSelectedGame(null)} />;
  } else if (showFiltersView) {
    compatibilityContent = <FiltersView
      setShowFiltersView={setShowFiltersView}
      allSwitchModels={allSwitchModels} selectedSwitchModels={selectedSwitchModels} toggleSwitchModel={toggleSwitchModel}
      allOcModes={allOcModes} selectedOcModes={selectedOcModes} toggleOcMode={toggleOcMode}
      allRatings={allRatings} selectedRatings={selectedRatings} toggleRating={toggleRating}
      handleSync={handleSync} syncing={syncing}
    />;
  } else {
    compatibilityContent = <CompatibilityListView
      compatGames={filteredGames}
      compatLoading={compatLoading}
      iconUrls={iconUrls}
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      setShowFiltersView={setShowFiltersView}
      showInstalledOnly={showInstalledOnly}
      setShowInstalledOnly={setShowInstalledOnly}
      onGameSelected={setSelectedGame}
      error={compatError}
    />;
  }

  const pages = [
    { title: t("tab_system"), content: <SystemView />, icon: <FaMicrochip />, route: "/nintendeck-settings/system" },
    { title: t("tab_wifi"), content: <WifiView />, icon: <FaWifi />, route: "/nintendeck-settings/wifi" },
    { title: t("tab_bluetooth"), content: <BluetoothView />, icon: <FaBluetooth />, route: "/nintendeck-settings/bluetooth" },
    { title: t("tab_tdp"), content: <TdpView />, icon: <FaPlug />, route: "/nintendeck-settings/tdp" },
    { title: t("tab_utilities"), content: <UtilitiesView confirmHekate={confirmHekate} setConfirmHekate={setConfirmHekate} hekateTimeout={hekateTimeout} confirmDesktop={confirmDesktop} setConfirmDesktop={setConfirmDesktop} desktopTimeout={desktopTimeout} />, icon: <FaWrench />, route: "/nintendeck-settings/utilities" },
    { title: t("tab_compatibility"), content: compatibilityContent, icon: <FaQuestionCircle />, route: "/nintendeck-settings/compatibility" },
  ];

  useEffect(() => {
    const handleBack = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedGame) setSelectedGame(null);
        else if (showFiltersView) setShowFiltersView(false);
        else Navigation.NavigateBack();
      }
    };
    window.addEventListener("keydown", handleBack);
    return () => window.removeEventListener("keydown", handleBack);
  }, [selectedGame, showFiltersView]);

  return (
    <SidebarNavigation
      title="NintenDeck Settings"
      showTitle={true}
      pages={pages}
    />
  );
};

// ---------- Plugin definition ----------
export default definePlugin(() => {
  const lang = detectLanguage();
  setLanguage(lang);

  routerHook.addRoute("/nintendeck-settings", SettingsPage);
  console.log(`[NintenDeck] Route /nintendeck-settings registered`);

  return {
    name: "NintenDeck",
    titleView: <div className={staticClasses.Title}>NintenDeck</div>,
    content: <QuickView onOpenSettings={() => { Navigation.CloseSideMenus(); Navigation.Navigate("/nintendeck-settings"); }} />,
    icon: <FaMicrochip />,
    onDismount: () => {
      routerHook.removeRoute("/nintendeck-settings");
      console.log("NintenDeck unloaded");
    },
  };
});
