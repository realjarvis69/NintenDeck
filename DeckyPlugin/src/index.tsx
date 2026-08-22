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
  afterPatch,
  findInReactTree,
  appDetailsClasses,
  createReactTreePatcher,
  ModalRoot,
  ModalPosition,
  showModal,
  Dropdown,
} from "@decky/ui";
import { callable, definePlugin, routerHook } from "@decky/api";
import React, { useState, useEffect, useRef, ReactElement } from "react";
import { FaMicrochip, FaArrowLeft, FaCog, FaWifi, FaLock, FaCheck, FaPlug, FaWrench, FaQuestionCircle, FaEye, FaEyeSlash, FaBluetooth, FaDesktop, FaSync, FaVolumeUp, FaVolumeOff, FaMicrophoneAlt, FaMicrophoneAltSlash, FaSun } from "react-icons/fa";
import { t, setLanguage, detectLanguage, translateRating, tWithParams } from "./lib/i18n";
import { Scrollable } from "./components/Scrollable";

// ---------- Types ----------
interface GameEntry {
  name: string;
  switch_model: string;
  oc_mode: string;
  ram_oc: string;
  rating: string;
  avg_fps: string;
  compatibility_tool: string;
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

interface DisplayInfo {
  name: string;
  display_name: string;
  current_resolution: string;
  available_resolutions: string[];
  current_refresh_rate: number;
  available_refresh_rates: number[];
  connected: boolean;
}

interface AudioSinkDevice {
  name: string;
  id: string;
  description: string;
  volume: number;
  muted: boolean;
  is_default: boolean;
}

interface AudioSourceDevice {
  name: string;
  id: string;
  description: string;
  volume: number;
  muted: boolean;
  is_default: boolean;
}

// ---------- Global Type Declarations ----------
declare global {
  interface Window {
    SteamClient?: {
      Apps?: {
        GetAppOverviewByGameID?: (appId: string) => {
          display_name?: string;
          name?: string;
          [key: string]: any;
        };
      };
      [key: string]: any;
    };
    mobx?: any;
  }
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
// Display callables
const getDisplayInfo = callable<[], DisplayInfo[]>("get_display_info");
const setDisplayResolution = callable<[name: string, resolution: string], boolean>("set_display_resolution");
const setDisplayRefreshRate = callable<[name: string, refresh_rate: number], boolean>("set_display_refresh_rate");
const getCurrentDisplayName = callable<[], string>("get_current_display_name");
const isDsiDisplay = callable<[], boolean>("is_dsi_display");
// Audio callables
const getAudioSinks = callable<[], AudioSinkDevice[]>("get_audio_sinks");
const getAudioSources = callable<[], AudioSourceDevice[]>("get_audio_sources");
const setDefaultSink = callable<[name: string], boolean>("set_default_sink");
const setDefaultSource = callable<[name: string], boolean>("set_default_source");
const setSinkVolume = callable<[name: string, volume: number], boolean>("set_sink_volume");
const setSourceVolume = callable<[name: string, volume: number], boolean>("set_source_volume");
const toggleSinkMute = callable<[name: string], boolean>("toggle_sink_mute");
const toggleSourceMute = callable<[name: string], boolean>("toggle_source_mute");
// Filter settings
const getSetting = callable<[key: string], string>("get_setting");
const setSetting = callable<[key: string, value: string], void>("set_setting");
const syncCompatibility = callable<[], boolean>("sync_compatibility");

// OC and Fan names with translations
const getOCNames = (): Record<number, string> => ({
  0: t("oc_mode_console"),
  1: t("oc_mode_handheld"),
  2: t("oc_mode_oc_cpu"),
  3: t("oc_mode_oc_gpu"),
  4: t("oc_mode_oc_all"),
  5: t("oc_mode_perf_oc"),
  6: t("oc_mode_perf_oc_all"),
});

const getFANNames = (): Record<number, string> => ({
  0: t("fan_console"),
  1: t("fan_handheld"),
  2: t("fan_cool"),
});

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

async function checkInternet(): Promise<boolean> {
  try {
    await fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

// ---------- Quick View (QAM content) ----------
const QuickView: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const [ocMode, setOcModeState] = useState<number>(0);
  const [fanMode, setFanModeState] = useState<number>(0);
  const [brightness, setBrightnessState] = useState<number>(50);
  const [volume, setVolumeState] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);

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
  }, []);

  const ocNames = getOCNames();
  const fanNames = getFANNames();

  const handleOcChange = async (v: number) => { setOcModeState(v); try { await setOcMode(v); } catch(e) { console.error(e); } };
  const handleFanChange = async (v: number) => { setFanModeState(v); try { await setFanMode(v); } catch(e) { console.error(e); } };
  const handleBrightnessChange = async (v: number) => { setBrightnessState(v); try { await setBrightness(v); } catch(e) { console.error(e); } };
  const handleVolumeChange = async (v: number) => { setVolumeState(v); try { await setVolume(v); } catch(e) { console.error(e); } };

  if (loading) return <PanelSection title={t("plugin_title")}><div>{t("loading")}</div></PanelSection>;

  return (
    <PanelSection title={t("plugin_title")}>
      <PanelSectionRow>
        <SliderField
          label={t("brightness")}
          value={brightness}
          min={0} max={100} step={1}
          showValue={false}
          onChange={handleBrightnessChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={t("volume")}
          value={volume}
          min={0} max={100} step={1}
          showValue={false}
          onChange={handleVolumeChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`${t("oc_mode")}: ${ocNames[ocMode]}`}
          value={ocMode}
          min={0} max={6} step={1}
          showValue={false}
          onChange={handleOcChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`${t("fan_mode")}: ${fanNames[fanMode]}`}
          value={fanMode}
          min={0} max={2} step={1}
          showValue={false}
          onChange={handleFanChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onOpenSettings}><FaCog /> {t("settings")}</ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

// ---------- Subviews for SidebarNavigation ----------
const TdpView: React.FC = () => {
  const [ocMode, setOcModeState] = useState<number>(0);
  const [fanMode, setFanModeState] = useState<number>(0);
  const [temps, setTemps] = useState({ cpu: "--", gpu: "--", battery: "--" });
  const [loading, setLoading] = useState(true);
  const ocNames = getOCNames();
  const fanNames = getFANNames();

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
      <PanelSectionRow>
        <SliderField
          label={`${t("tdp_mode")}: ${ocNames[ocMode]}`}
          value={ocMode}
          min={0} max={6} step={1}
          showValue={false}
          onChange={handleOcChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`${t("fan_mode_label")}: ${fanNames[fanMode]}`}
          value={fanMode}
          min={0} max={2} step={1}
          showValue={false}
          onChange={handleFanChange}
        />
      </PanelSectionRow>
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

// ---------- Modal Components ----------
// Wi-Fi Password Modal
const WifiPasswordModal: React.FC<{
  ssid: string;
  onConnect: (password: string) => void;
  onCancel: () => void;
  isConnecting: boolean;
  error: string | null;
  closeModal?: () => void;
}> = ({ ssid, onConnect, onCancel, isConnecting, error, closeModal }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleClose = () => {
    if (closeModal) {
      closeModal();
    } else {
      onCancel();
    }
  };

  const handleConnect = () => {
    onConnect(password);
  };

  return (
    <ModalRoot
      position={ModalPosition.CENTER}
      onCancel={handleClose}
      onEscKeypress={handleClose}
      onGamepadClose={handleClose}
      bAllowFullSize={false}
    >
      <div style={{
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        minWidth: "320px",
      }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#eee" }}>
          {t("wifi_enter_password").replace("{ssid}", ssid)}
        </h2>

        <TextField
          value={password}
          onChange={(e: any) => setPassword(e.target.value)}
          bIsPassword={true}
          label={t("wifi_password")}
          style={{ width: "100%" }}
          onKeyDown={(e: any) => {
            if (e.key === "Enter") handleConnect();
          }}
        />

        {isConnecting && (
          <div style={{ textAlign: "center", padding: "8px" }}>
            <Spinner style={{ width: "32px", height: "32px" }} />
            <div style={{ color: "#aaa", marginTop: "8px" }}>{t("wifi_connecting")}</div>
          </div>
        )}

        {error && (
          <Focusable
            focusWithinClassName="gpfocuswithin"
            onActivate={() => {}}
            style={{ width: "100%" }}
          >
            <div style={{
              color: "#e74c3c",
              textAlign: "center",
              padding: "8px",
              background: "rgba(231,76,60,0.1)",
              borderRadius: "6px",
            }}>
              {error}
            </div>
          </Focusable>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          <ButtonItem layout="below" onClick={handleConnect} disabled={isConnecting} style={{ width: "100%" }}>
            {isConnecting ? t("wifi_connecting") : t("wifi_connect")}
          </ButtonItem>
          <ButtonItem layout="below" onClick={handleClose} disabled={isConnecting} style={{ width: "100%" }}>
            {t("cancel")}
          </ButtonItem>
        </div>
      </div>
    </ModalRoot>
  );
};

// Compatibility Detail Modal
const CompatibilityDetailModal: React.FC<{
  game: GameEntry;
  onClose: () => void;
  closeModal?: () => void;
}> = ({ game, onClose, closeModal }) => {

  const handleClose = () => {
    if (closeModal) {
      closeModal();
    } else {
      onClose();
    }
  };

  const sections = [
    { key: "rating", label: t("compatibility_rating") },
    { key: "switch_model", label: t("switch_model") },
    { key: "oc_mode", label: t("recommended_oc_mode") },
    { key: "ram_oc", label: t("ram_oc") },
    { key: "avg_fps", label: t("average_fps") },
    { key: "compatibility_tool", label: t("compatibility_tool") },
    { key: "launch_options", label: t("launch_options") },
    { key: "extra_info", label: t("extra_info") },
    { key: "submitted_by", label: t("submitted_by") },
  ];

  const renderTextBlock = (label: string, content: string, isCode: boolean = false) => (
    <div style={{ marginBottom: "12px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "13px", color: "#aaa" }}>
        {label}
      </div>
      <Focusable
        focusWithinClassName="gpfocuswithin"
        onActivate={() => {}}
        style={{
          width: "100%",
          boxSizing: "border-box",
          margin: 0,
          padding: "8px 12px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "6px",
          fontFamily: isCode ? "monospace" : "inherit",
          whiteSpace: isCode ? "pre-wrap" : "normal",
          overflowWrap: "break-word",
          wordBreak: "normal",
          fontSize: "14px",
          userSelect: "text",
          cursor: "text",
        }}
      >
        {content}
      </Focusable>
      {isCode && (
        <ButtonItem layout="below" onClick={() => copyToClipboard(content)}>
          {t("copy_to_clipboard")}
        </ButtonItem>
      )}
    </div>
  );

  return (
    <ModalRoot
      position={ModalPosition.CENTER}
      onCancel={handleClose}
      onEscKeypress={handleClose}
      onGamepadClose={handleClose}
      bAllowFullSize={false}
    >
      <div
        style={{
          padding: "20px 24px",
          width: "100%",
          maxWidth: "550px",
          minWidth: "340px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Scrollable style={{ flex: 1, paddingRight: "8px", overflowX: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#eee" }}>
              {game.name}
            </h2>
            <ButtonItem
              layout="below"
              onClick={handleClose}
              style={{ minWidth: "40px", padding: "4px 8px" }}
            >
              ✕
            </ButtonItem>
          </div>

          {sections.map((section) => {
            const value = game[section.key as keyof GameEntry];
            if (!value) return null;
            return renderTextBlock(
              section.label,
              section.key === "rating" ? translateRating(value) : value,
              section.key === "launch_options"
            );
          })}
        </Scrollable>
      </div>
    </ModalRoot>
  );
};

// ---------- Wi-Fi Views ----------
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
    } else {
      setConnectError(result.error === "wrong_password" ? t("wifi_wrong_password") : t("wifi_connection_failed"));
    }
    setIsConnecting(false);
    setConnectingTo(null);
  };

  const handleConnectClick = (ssid: string, secured: boolean) => {
    if (secured) {
      showModal(
        <WifiPasswordModal
          ssid={ssid}
          onConnect={(password) => {
            connectWifiDirect(ssid, password);
          }}
          onCancel={() => {}}
          isConnecting={isConnecting}
          error={connectError}
        />,
        window
      );
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

// ---------- Audio Tab ----------
const AudioView: React.FC = () => {
  const [sinks, setSinks] = useState<AudioSinkDevice[]>([]);
  const [sources, setSources] = useState<AudioSourceDevice[]>([]);
  const [selectedSink, setSelectedSink] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [sinkVolume, setSinkVolumeState] = useState<number>(50);
  const [sourceVolume, setSourceVolumeState] = useState<number>(50);
  const [sinkMuted, setSinkMuted] = useState<boolean>(false);
  const [sourceMuted, setSourceMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyMessageType, setApplyMessageType] = useState<"success" | "error" | null>(null);

  const loadAudioDevices = async () => {
    try {
      setLoading(true);
      const [sinkData, sourceData] = await Promise.all([
        getAudioSinks(),
        getAudioSources()
      ]);

      setSinks(sinkData);
      setSources(sourceData);

      // Find default sink
      const defaultSink = sinkData.find(s => s.is_default);
      if (defaultSink) {
        setSelectedSink(defaultSink.name);
        setSinkVolumeState(defaultSink.volume);
        setSinkMuted(defaultSink.muted);
      } else if (sinkData.length > 0) {
        setSelectedSink(sinkData[0].name);
        setSinkVolumeState(sinkData[0].volume);
        setSinkMuted(sinkData[0].muted);
      }

      // Find default source
      const defaultSource = sourceData.find(s => s.is_default);
      if (defaultSource) {
        setSelectedSource(defaultSource.name);
        setSourceVolumeState(defaultSource.volume);
        setSourceMuted(defaultSource.muted);
      } else if (sourceData.length > 0) {
        setSelectedSource(sourceData[0].name);
        setSourceVolumeState(sourceData[0].volume);
        setSourceMuted(sourceData[0].muted);
      }

      setApplyMessage(null);
    } catch (e) {
      console.error("[AudioView] Failed to load audio devices:", e);
      setApplyMessage("Failed to load audio devices");
      setApplyMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const handleSinkChange = async (option: any) => {
    const sinkName = option.data;
    setSelectedSink(sinkName);
    setApplying(true);
    setApplyMessage(null);

    try {
      const success = await setDefaultSink(sinkName);
      if (success) {
        const sink = sinks.find(s => s.name === sinkName);
        if (sink) {
          setSinkVolumeState(sink.volume);
          setSinkMuted(sink.muted);
        }
        setApplyMessage("Output device changed");
        setApplyMessageType("success");
        await loadAudioDevices();
      } else {
        setApplyMessage("Failed to change output device");
        setApplyMessageType("error");
      }
    } catch (e) {
      console.error("[AudioView] Failed to change sink:", e);
      setApplyMessage("Failed to change output device");
      setApplyMessageType("error");
    } finally {
      setApplying(false);
    }
  };

  const handleSourceChange = async (option: any) => {
    const sourceName = option.data;
    setSelectedSource(sourceName);
    setApplying(true);
    setApplyMessage(null);

    try {
      const success = await setDefaultSource(sourceName);
      if (success) {
        const source = sources.find(s => s.name === sourceName);
        if (source) {
          setSourceVolumeState(source.volume);
          setSourceMuted(source.muted);
        }
        setApplyMessage("Input device changed");
        setApplyMessageType("success");
        await loadAudioDevices();
      } else {
        setApplyMessage("Failed to change input device");
        setApplyMessageType("error");
      }
    } catch (e) {
      console.error("[AudioView] Failed to change source:", e);
      setApplyMessage("Failed to change input device");
      setApplyMessageType("error");
    } finally {
      setApplying(false);
    }
  };

  const handleSinkVolumeChange = async (v: number) => {
    setSinkVolumeState(v);
    try {
      await setSinkVolume(selectedSink, v);
    } catch(e) { console.error(e); }
  };

  const handleSourceVolumeChange = async (v: number) => {
    setSourceVolumeState(v);
    try {
      await setSourceVolume(selectedSource, v);
    } catch(e) { console.error(e); }
  };

  const selectedSinkInfo = sinks.find(s => s.name === selectedSink);
  const selectedSourceInfo = sources.find(s => s.name === selectedSource);

  // Check if there are any sources (microphones) available
  const hasSources = sources.length > 0;

  return (
    <PanelSection title={t("audio_settings")}>
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spinner style={{ width: "45px", height: "45px" }} />
        </div>
      ) : (
        <>
          {/* Output Section */}
          <h3 style={{ margin: "8px 0 4px 0", fontSize: "16px", color: "#aaa" }}>{t("audio_output")}</h3>

          <div style={{ marginBottom: "8px" }}>
            <PanelSectionRow>
              <Dropdown
                menuLabel={t("audio_output_device")}
                selectedOption={selectedSink || undefined}
                rgOptions={sinks.map(sink => ({
                  data: sink.name,
                  label: sink.description || sink.name,
                }))}
                onChange={handleSinkChange}
                strDefaultLabel={t("audio_select_output")}
                disabled={applying}
              />
            </PanelSectionRow>
          </div>

          {selectedSinkInfo && (
            <div style={{ marginBottom: "12px" }}>
              <PanelSectionRow>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <span style={{ flexShrink: 0, width: "20px", color: "#8b8b8b", fontSize: "16px" }}>
                    {sinkMuted ? (
                      <FaVolumeOff />
                    ) : (
                      <FaVolumeUp />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SliderField
                      value={sinkVolume}
                      min={0}
                      max={100}
                      step={1}
                      showValue={false}
                      onChange={handleSinkVolumeChange}
                    />
                  </div>
                </div>
              </PanelSectionRow>
            </div>
          )}

          {/* Input Section - only show if there are microphones */}
          {hasSources && (
            <>
              <h3 style={{ margin: "16px 0 4px 0", fontSize: "16px", color: "#aaa" }}>{t("audio_input")}</h3>

              <div style={{ marginBottom: "8px" }}>
                <PanelSectionRow>
                  <Dropdown
                    menuLabel={t("audio_input_device")}
                    selectedOption={selectedSource || undefined}
                    rgOptions={sources.map(source => ({
                      data: source.name,
                      label: source.description || source.name,
                    }))}
                    onChange={handleSourceChange}
                    strDefaultLabel={t("audio_select_input")}
                    disabled={applying}
                  />
                </PanelSectionRow>
              </div>

              {selectedSourceInfo && (
                <div style={{ marginBottom: "8px" }}>
                  <PanelSectionRow>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                      <span style={{ flexShrink: 0, width: "20px", color: "#8b8b8b", fontSize: "16px" }}>
                        {sourceMuted ? (
                          <FaMicrophoneAltSlash />
                        ) : (
                          <FaMicrophoneAlt />
                        )}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SliderField
                          value={sourceVolume}
                          min={0}
                          max={100}
                          step={1}
                          showValue={false}
                          onChange={handleSourceVolumeChange}
                        />
                      </div>
                    </div>
                  </PanelSectionRow>
                </div>
              )}
            </>
          )}

          {applyMessage && (
            <div style={{
              marginTop: "8px",
              color: applyMessageType === "success" ? "#4caf50" : "#e74c3c",
              textAlign: "center",
              fontSize: "13px",
              padding: "4px"
            }}>
              {applyMessage}
            </div>
          )}
        </>
      )}
    </PanelSection>
  );
};

// ---------- Display Tab ----------
interface DisplayData {
  name: string;
  display_name: string;
  is_primary: boolean;
  current_resolution: string;
  current_refresh_rate: number;
  resolutions: Record<string, number[]>;
  connected: boolean;
}

const DisplayView: React.FC = () => {
  const [displays, setDisplays] = useState<DisplayData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDisplay, setSelectedDisplay] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>("");
  const [selectedRefreshRate, setSelectedRefreshRate] = useState<number>(60);
  const [brightness, setBrightnessState] = useState<number>(50);
  const [isDsi, setIsDsi] = useState<boolean>(false);
  const [currentDisplayName, setCurrentDisplayName] = useState<string>("");
  const [applying, setApplying] = useState<boolean>(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyMessageType, setApplyMessageType] = useState<"success" | "error" | null>(null);

  const loadDisplays = async () => {
    try {
      setLoading(true);
      const [info, dsi, displayName] = await Promise.all([
        getDisplayInfo(),
        isDsiDisplay(),
        getCurrentDisplayName()
      ]);

      const formattedDisplays = info.map((display: any) => ({
        name: display.name,
        display_name: display.display_name || display.name,
        is_primary: display.is_primary || false,
        current_resolution: display.current_resolution || "",
        current_refresh_rate: display.current_refresh_rate || 60,
        resolutions: display.resolutions || {},
        connected: display.connected !== false,
      }));

      setDisplays(formattedDisplays);
      setIsDsi(dsi);
      setCurrentDisplayName(displayName);

      if (formattedDisplays.length > 0 && !selectedDisplay) {
        const display = formattedDisplays[0];
        setSelectedDisplay(display.name);
        const res = display.current_resolution || Object.keys(display.resolutions)[0] || "";
        setSelectedResolution(res);
        const rates = res ? display.resolutions[res] || [] : [];
        setSelectedRefreshRate(display.current_refresh_rate || rates[0] || 60);
      }
      if (dsi) {
        const br = await getBrightness();
        setBrightnessState(br);
      }
    } catch (e) {
      console.error("[DisplayView] Failed to load displays:", e);
      setApplyMessage(t("display_apply_failed"));
      setApplyMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisplays();
  }, []);

  const handleBrightnessChange = async (v: number) => {
    setBrightnessState(v);
    try {
      await setBrightness(v);
    } catch (e) {
      console.error("[DisplayView] Failed to set brightness:", e);
    }
  };

  const handleApplyChanges = async () => {
    if (!selectedDisplay) return;

    setApplying(true);
    setApplyMessage(null);
    setApplyMessageType(null);

    try {
      const resSuccess = await setDisplayResolution(selectedDisplay, selectedResolution);
      if (!resSuccess) {
        setApplyMessage(t("display_res_failed"));
        setApplyMessageType("error");
        setApplying(false);
        return;
      }

      const refreshSuccess = await setDisplayRefreshRate(selectedDisplay, selectedRefreshRate);
      if (!refreshSuccess) {
        setApplyMessage(t("display_refresh_failed"));
        setApplyMessageType("error");
        setApplying(false);
        return;
      }

      setApplyMessage(t("display_applied_success"));
      setApplyMessageType("success");
      await loadDisplays();

    } catch (e) {
      console.error("[DisplayView] Failed to apply settings:", e);
      setApplyMessage(t("display_apply_failed"));
      setApplyMessageType("error");
    } finally {
      setApplying(false);
    }
  };

  const selectedDisplayInfo = displays.find(d => d.name === selectedDisplay);

  const getRefreshRatesForResolution = (res: string) => {
    if (!selectedDisplayInfo || !res) return [];
    return selectedDisplayInfo.resolutions[res] || [];
  };

  const isResolutionAbove720p = (res: string) => {
    if (!res) return false;
    const match = res.match(/(\d+)x(\d+)/);
    if (!match) return false;
    const height = parseInt(match[2]);
    return height > 720;
  };

  const showWarning = selectedResolution && isResolutionAbove720p(selectedResolution);

  const handleDisplayChange = (option: any) => {
    const display = displays.find(d => d.name === option.data);
    if (display) {
      setSelectedDisplay(display.name);
      const res = display.current_resolution || Object.keys(display.resolutions)[0] || "";
      setSelectedResolution(res);
      const rates = res ? display.resolutions[res] || [] : [];
      setSelectedRefreshRate(display.current_refresh_rate || rates[0] || 60);
    }
  };

  const handleResolutionChange = (option: any) => {
    const res = option.data;
    setSelectedResolution(res);
    const rates = getRefreshRatesForResolution(res);
    setSelectedRefreshRate(rates[0] || 60);
  };

  const handleRefreshRateChange = (option: any) => {
    setSelectedRefreshRate(parseFloat(option.data));
  };

  const isInternalDisplay = selectedDisplayInfo?.name?.startsWith("DSI") || false;

  return (
    <PanelSection title={t("display_settings")}>
      {showWarning && (
        <Focusable
          focusWithinClassName="gpfocuswithin"
          onActivate={() => {}}
          style={{
            width: "100%",
            margin: "8px 0 12px 0",
            padding: "8px 16px",
            background: "rgba(255, 193, 7, 0.12)",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ fontSize: "13px", color: "#ffd54f" }}>
              {t("display_warning")}
            </span>
          </div>
        </Focusable>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spinner style={{ width: "45px", height: "45px" }} />
        </div>
      ) : displays.length === 0 ? (
        <div style={{ textAlign: "center", color: "#aaa", padding: "20px" }}>
          {t("display_no_displays")}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "8px" }}>
            <PanelSectionRow>
              <Dropdown
                menuLabel={t("display_select_display")}
                selectedOption={selectedDisplay || undefined}
                rgOptions={displays.filter(d => d.connected).map(display => ({
                  data: display.name,
                  label: display.name.startsWith("DSI") ? t("display_builtin") : t("display_external"),
                }))}
                onChange={handleDisplayChange}
                strDefaultLabel={t("display_select_display")}
              />
            </PanelSectionRow>
          </div>

          {selectedDisplayInfo && selectedDisplayInfo.connected && (
            <>
              {!isInternalDisplay && (
                <>
                  <div style={{ marginBottom: "8px" }}>
                    <PanelSectionRow>
                      <Dropdown
                        menuLabel={t("display_resolution")}
                        selectedOption={selectedResolution || undefined}
                        rgOptions={Object.keys(selectedDisplayInfo.resolutions).map(res => ({
                          data: res,
                          label: res,
                        }))}
                        onChange={handleResolutionChange}
                        strDefaultLabel={t("display_resolution")}
                      />
                    </PanelSectionRow>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <PanelSectionRow>
                      <Dropdown
                        menuLabel={t("display_refresh_rate")}
                        selectedOption={selectedRefreshRate.toString() || undefined}
                        rgOptions={getRefreshRatesForResolution(selectedResolution).map(rate => ({
                          data: rate.toString(),
                          label: `${rate} Hz`,
                        }))}
                        onChange={handleRefreshRateChange}
                        strDefaultLabel={t("display_refresh_rate")}
                      />
                    </PanelSectionRow>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <PanelSectionRow>
                      <ButtonItem
                        layout="below"
                        onClick={handleApplyChanges}
                        disabled={applying}
                        style={{ width: "100%" }}
                      >
                        {applying ? t("display_applying") : t("display_apply")}
                      </ButtonItem>
                    </PanelSectionRow>
                  </div>

                  {applyMessage && (
                    <div style={{
                      marginTop: "4px",
                      color: applyMessageType === "success" ? "#4caf50" : "#e74c3c",
                      textAlign: "center",
                      fontSize: "13px",
                      padding: "4px"
                    }}>
                      {applyMessage}
                    </div>
                  )}
                </>
              )}

              {isInternalDisplay && isDsi && (
                <div style={{ marginTop: "8px" }}>
                  <PanelSectionRow>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                      <FaSun style={{ flexShrink: 0, width: "20px", color: "#8b8b8b", fontSize: "16px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SliderField
                          value={brightness}
                          min={0}
                          max={100}
                          step={1}
                          showValue={false}
                          onChange={handleBrightnessChange}
                        />
                      </div>
                    </div>
                  </PanelSectionRow>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PanelSection>
  );
};

// ---------- Compatibility Components ----------
const CompatibilityListView: React.FC<{
  compatGames: GameEntry[];
  compatLoading: boolean;
  iconUrls: Record<string, string>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  setShowFiltersView: (v: boolean) => void;
  showInstalledOnly: boolean;
  setShowInstalledOnly: (v: boolean) => void;
  error: string | null;
}> = ({ compatGames, compatLoading, iconUrls, searchInput, setSearchInput,
        setShowFiltersView, showInstalledOnly, setShowInstalledOnly, error }) => {
  const filteredGames = compatGames.filter(game => {
    if (!game.name.toLowerCase().includes(searchInput.toLowerCase())) return false;
    return true;
  });

  const handleGameClick = (game: GameEntry) => {
    showModal(
      <CompatibilityDetailModal game={game} onClose={() => {}} />,
      window
    );
  };

  return (
    <PanelSection title={t("compatibility_title")}>
      <Scrollable style={{ height: "calc(100vh - 80px)", padding: "0 8px" }}>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setShowFiltersView(true)}>
            {t("filters")}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField
            label={t("search_games")}
            value={searchInput}
            onChange={(e: any) => setSearchInput(e.target.value)}
            style={{ width: "100%" }}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t("show_installed_only")}
            checked={showInstalledOnly}
            onChange={() => setShowInstalledOnly(!showInstalledOnly)}
          />
        </PanelSectionRow>
        {compatLoading ? (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <Spinner style={{ width: "45px", height: "45px" }} />
          </div>
        ) : error ? (
          <Focusable
            focusWithinClassName="gpfocuswithin"
            onActivate={() => {}}
            style={{ width: "100%", margin: "4px 0" }}
          >
            <div style={{ textAlign: "center", color: "#e74c3c", padding: "20px" }}>
              {error}
            </div>
          </Focusable>
        ) : filteredGames.length === 0 ? (
          <Focusable
            focusWithinClassName="gpfocuswithin"
            onActivate={() => {}}
            style={{ width: "100%", margin: "4px 0" }}
          >
            <div style={{ textAlign: "center", color: "#aaa", padding: "20px" }}>
              {t("no_games_found")}
            </div>
          </Focusable>
        ) : (
          filteredGames.map((game) => (
            <PanelSectionRow key={game.name}>
              <Focusable
                focusWithinClassName="gpfocuswithin"
                onActivate={() => handleGameClick(game)}
                style={{ width: "100%" }}
              >
                <ButtonItem layout="below" onClick={() => handleGameClick(game)}>
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
              </Focusable>
            </PanelSectionRow>
          ))
        )}
      </Scrollable>
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
        handleSync, syncing }) => {
  const translatedOcModes = allOcModes.map(mode => {
    const modeMap: Record<string, string> = {
      "Console": t("oc_mode_console"),
      "Handheld": t("oc_mode_handheld"),
      "OC CPU": t("oc_mode_oc_cpu"),
      "OC GPU": t("oc_mode_oc_gpu"),
      "OC All": t("oc_mode_oc_all"),
      "Perf OC": t("oc_mode_perf_oc"),
      "Perf OC All": t("oc_mode_perf_oc_all"),
    };
    return modeMap[mode] || mode;
  });

  const translatedRatings = allRatings.map(rating => {
    const ratingMap: Record<string, string> = {
      "Perfect": t("rating_perfect"),
      "Playable": t("rating_playable"),
      "Unplayable": t("rating_unplayable"),
      "Unsupported": t("rating_unsupported"),
      "Unknown": t("rating_unknown"),
    };
    return ratingMap[rating] || rating;
  });

  const handleSwitchModelChange = (option: any) => {
    const model = option.data;
    toggleSwitchModel(model);
  };

  const handleOcModeChange = (option: any) => {
    const mode = option.data;
    toggleOcMode(mode);
  };

  const handleRatingChange = (option: any) => {
    const rating = option.data;
    toggleRating(rating);
  };

  return (
    <PanelSection title={t("game_filters")}>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setShowFiltersView(false)}>
          <FaArrowLeft /> {t("back")}
        </ButtonItem>
      </PanelSectionRow>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px" }}>
        {/* Switch Model Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "13px", color: "#aaa" }}>{t("switch_model_filter")}</div>
          <Dropdown
            menuLabel={t("switch_model_filter")}
            selectedOption={selectedSwitchModels.join(',') || undefined}
            rgOptions={allSwitchModels.map(model => ({
              data: model,
              label: model,
            }))}
            onChange={handleSwitchModelChange}
            strDefaultLabel={t("switch_model_filter")}
          />
        </div>

        {/* OC Mode Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "13px", color: "#aaa" }}>{t("oc_mode_filter_label")}</div>
          <Dropdown
            menuLabel={t("oc_mode_filter_label")}
            selectedOption={selectedOcModes.join(',') || undefined}
            rgOptions={allOcModes.map((mode, index) => ({
              data: mode,
              label: translatedOcModes[index],
            }))}
            onChange={handleOcModeChange}
            strDefaultLabel={t("oc_mode_filter_label")}
          />
        </div>

        {/* Rating Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "13px", color: "#aaa" }}>{t("rating_filter_label")}</div>
          <Dropdown
            menuLabel={t("rating_filter_label")}
            selectedOption={selectedRatings.join(',') || undefined}
            rgOptions={allRatings.map((rating, index) => ({
              data: rating,
              label: translatedRatings[index],
            }))}
            onChange={handleRatingChange}
            strDefaultLabel={t("rating_filter_label")}
          />
        </div>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleSync} disabled={syncing}>
            {syncing ? t("syncing") : t("sync")}
          </ButtonItem>
        </PanelSectionRow>
      </div>
    </PanelSection>
  );
};

// ---------- Library Patch: Compatibility Badge ----------
const CompatibilityBadge: React.FC<{ appId: string }> = ({ appId }) => {
  const [gameName, setGameName] = useState<string>("");
  const [compatData, setCompatData] = useState<GameEntry | null>(null);
  const [iconUrl, setIconUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [rating, setRating] = useState<string>("unknown");
  const [hasInternet, setHasInternet] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const online = await checkInternet();
        setHasInternet(online);
        console.log(`[CompatBadge] Internet: ${online ? "online" : "offline"}`);

        let name = "";

        try {
          const appOverview = (window as any).SteamClient?.Apps?.GetAppOverviewByGameID?.(appId);
          if (appOverview) {
            name = appOverview.display_name || appOverview.name || "";
            console.log(`[CompatBadge] SteamClient returned: "${name}"`);
          }
        } catch (e) {
          console.error("[CompatBadge] Failed to get game name from SteamClient:", e);
        }

        if (!name && online) {
          try {
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
            const data = await response.json();
            if (data && data[appId] && data[appId].success) {
              name = data[appId].data.name;
              console.log(`[CompatBadge] Steam API returned: "${name}"`);
            }
          } catch (e) {
            console.error("[CompatBadge] Failed to fetch game name from Steam API:", e);
          }
        }

        if (!name) {
          const titleEl = document.querySelector('title');
          if (titleEl) {
            const title = titleEl.innerText;
            name = title.replace(/ on Steam$/, '').trim();
            console.log(`[CompatBadge] Fallback title: "${name}"`);
          }
        }

        if (name) {
          setGameName(name);
          const games = await getCompatibilityData(true);
          let game = games.find(g => g.name.toLowerCase() === name.toLowerCase());
          if (!game) {
            game = games.find(g => name.toLowerCase().includes(g.name.toLowerCase()) ||
                                   g.name.toLowerCase().includes(name.toLowerCase()));
          }
          if (game) {
            setCompatData(game);
            setRating(game.rating.toLowerCase());
            const icon = await getIconBase64(game.rating.toLowerCase());
            setIconUrl(icon);
            console.log(`[CompatBadge] Found compat data: ${game.name} (${game.rating})`);
          } else {
            console.log(`[CompatBadge] No compatibility data found for "${name}"`);
          }
        } else {
          console.log(`[CompatBadge] Could not determine game name for appId: ${appId}`);
        }
      } catch (e) {
        console.error("[CompatBadge] Error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [appId]);

  const handleClick = () => {
    if (compatData) {
      console.log(`[CompatBadge] Clicked, opening modal for ${compatData.name}`);
      showModal(
        <CompatibilityDetailModal game={compatData} onClose={() => {}} />,
        window
      );
    } else {
      console.log("[CompatBadge] No compat data to show");
    }
  };

  if (!hasInternet || !compatData) {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        position: "absolute",
        top: "23.4%",
        left: "2.5%",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(0,0,0,0.5)",
        borderRadius: "8px",
        padding: "6px 12px",
        backdropFilter: "blur(4px)",
      }}>
        <Spinner style={{ width: "20px", height: "20px" }} />
        <span style={{ color: "#aaa", fontSize: "13px" }}>Loading...</span>
      </div>
    );
  }

  const ratingLabel = compatData ? translateRating(compatData.rating) : t("rating_unknown");

  return (
    <Focusable
      focusWithinClassName="gpfocuswithin"
      onActivate={handleClick}
      style={{
        position: "absolute",
        top: "23.4%",
        left: "2.5%",
        zIndex: 10,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 14px 6px 10px",
        borderRadius: "8px",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.15)";
        el.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(0,0,0,0.65)";
        el.style.transform = "scale(1)";
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          style={{ width: "28px", height: "28px", objectFit: "contain", flexShrink: 0 }}
          alt={rating}
        />
      ) : (
        <FaQuestionCircle size={22} style={{ opacity: 0.5, color: "#888", flexShrink: 0 }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{
          fontWeight: "600",
          fontSize: "14px",
          color: "#eee",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "200px",
        }}>
          {gameName || "Unknown Game"}
        </span>
        <span style={{
          fontSize: "11px",
          color: compatData ? (rating === "perfect" ? "#4caf50" :
                              rating === "playable" ? "#ff9800" :
                              rating === "unplayable" ? "#f44336" : "#888") : "#888",
          opacity: 0.8,
        }}>
          {t("rating_label")}: {ratingLabel}
        </span>
      </div>
    </Focusable>
  );
};

// Route patching function
function patchLibraryApp() {
  console.log("[patchLibraryApp] Adding patch for /library/app/:appid");
  return routerHook.addPatch(
    '/library/app/:appid',
    (tree: any) => {
      console.log("[patchLibraryApp] Patch triggered for /library/app/:appid");
      const routeProps = findInReactTree(tree, (x: any) => x?.renderFunc);
      if (routeProps) {
        console.log("[patchLibraryApp] Found routeProps");

        const patchHandler = createReactTreePatcher([
          (tree: any) => findInReactTree(tree, (x: any) => x?.props?.children?.props?.overview)?.props?.children
        ], (_: Array<Record<string, unknown>>, ret?: ReactElement) => {

          const artworkContainer = findInReactTree(
            ret,
            (x: any) => {
              if (!x?.props?.className) return false;
              const className = String(x.props.className);
              return className.includes('appPortrait') ||
                     className.includes('appHeader') ||
                     className.includes('artwork') ||
                     className.includes('Hero') ||
                     className.includes('hero');
            }
          );

          let appId = routeProps?.props?.match?.params?.appid || "";
          if (!appId) {
            const match = window.location.pathname.match(/\/library\/app\/(\d+)/);
            if (match) {
              appId = match[1];
            }
          }
          console.log(`[patchLibraryApp] appId: ${appId}`);

          if (artworkContainer && typeof artworkContainer === 'object') {
            console.log("[patchLibraryApp] Found artwork container, adding badge");

            const badgeWrapper = (
              <div
                key="nintendeck-badge-wrapper"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "contents"
                }}
              >
                <CompatibilityBadge appId={appId} />
              </div>
            );

            if (Array.isArray(artworkContainer.props.children)) {
              artworkContainer.props.children.unshift(badgeWrapper);
            } else if (artworkContainer.props.children) {
              const existingChild = artworkContainer.props.children;
              artworkContainer.props.children = [badgeWrapper, existingChild];
            } else {
              artworkContainer.props.children = [badgeWrapper];
            }
          } else {
            console.log("[patchLibraryApp] Artwork container not found, trying inner container");
            const container = findInReactTree(
              ret,
              (x: any) =>
                Array.isArray(x?.props?.children) &&
                x?.props?.className?.includes(
                  appDetailsClasses.InnerContainer
                )
            );
            if (container && typeof container === 'object') {
              container.props.children.splice(
                0,
                0,
                <CompatibilityBadge appId={appId} key="nintendeck-compat-badge" />
              );
              console.log("[patchLibraryApp] Added badge to inner container");
            } else {
              console.log("[patchLibraryApp] Could not find any container to add badge");
            }
          }

          return ret;
        });

        afterPatch(routeProps, "renderFunc", patchHandler);
      } else {
        console.log("[patchLibraryApp] routeProps not found");
      }

      return tree;
    }
  );
}

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
  const [confirmHekate, setConfirmHekate] = useState<boolean>(false);
  const [compatError, setCompatError] = useState<string | null>(null);
  const hekateTimeout = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearchTerm = useDebounce(searchInput, 2000);
  const isFirstLoad = useRef<boolean>(true);

  useEffect(() => {
    const preselected = (window as any).__nintendeck_selected_game;
    if (preselected) {
      showModal(
        <CompatibilityDetailModal game={preselected} onClose={() => {}} />,
        window
      );
      (window as any).__nintendeck_selected_game = null;
    }
  }, []);

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
    if (!showFiltersView) {
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
  }, [showFiltersView]);

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
  if (showFiltersView) {
    compatibilityContent = <FiltersView
      setShowFiltersView={setShowFiltersView}
      allSwitchModels={allSwitchModels}
      selectedSwitchModels={selectedSwitchModels}
      toggleSwitchModel={toggleSwitchModel}
      allOcModes={allOcModes}
      selectedOcModes={selectedOcModes}
      toggleOcMode={toggleOcMode}
      allRatings={allRatings}
      selectedRatings={selectedRatings}
      toggleRating={toggleRating}
      handleSync={handleSync}
      syncing={syncing}
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
      error={compatError}
    />;
  }

  const pages = [
    { title: t("audio_tab"), content: <AudioView />, icon: <FaVolumeUp />, route: "/nintendeck-settings/audio" },
    { title: "Display", content: <DisplayView />, icon: <FaDesktop />, route: "/nintendeck-settings/display" },
    { title: t("tab_wifi"), content: <WifiView />, icon: <FaWifi />, route: "/nintendeck-settings/wifi" },
    { title: t("tab_bluetooth"), content: <BluetoothView />, icon: <FaBluetooth />, route: "/nintendeck-settings/bluetooth" },
    { title: t("tab_tdp"), content: <TdpView />, icon: <FaPlug />, route: "/nintendeck-settings/tdp" },
    { title: t("tab_utilities"), content: <UtilitiesView confirmHekate={confirmHekate} setConfirmHekate={setConfirmHekate} hekateTimeout={hekateTimeout} />, icon: <FaWrench />, route: "/nintendeck-settings/utilities" },
    { title: t("tab_compatibility"), content: compatibilityContent, icon: <FaQuestionCircle />, route: "/nintendeck-settings/compatibility" },
  ];

  useEffect(() => {
    const handleBack = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showFiltersView) {
          setShowFiltersView(false);
        } else {
          Navigation.NavigateBack();
        }
      }
    };
    window.addEventListener("keydown", handleBack);
    return () => window.removeEventListener("keydown", handleBack);
  }, [showFiltersView]);

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

  let libraryPatch: any = null;
  try {
    libraryPatch = patchLibraryApp();
    console.log("[NintenDeck] Library route patch applied");
  } catch (e) {
    console.error("[NintenDeck] Failed to apply library route patch:", e);
  }

  return {
    name: "NintenDeck",
    titleView: <div className={staticClasses.Title}>NintenDeck</div>,
    content: <QuickView onOpenSettings={() => { Navigation.CloseSideMenus(); Navigation.Navigate("/nintendeck-settings"); }} />,
    icon: <FaMicrochip />,
    onDismount: () => {
      routerHook.removeRoute("/nintendeck-settings");
      if (libraryPatch) {
        routerHook.removePatch('/library/app/:appid', libraryPatch);
        console.log("[NintenDeck] Library route patch removed");
      }
      console.log("NintenDeck unloaded");
    },
  };
});
