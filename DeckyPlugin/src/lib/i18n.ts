// src/lib/i18n.ts
import { useEffect, useState } from "react";

// ---------- Type Definitions ----------
export type Language = "en" | "ru" | "es" | "fr";

export interface Translations {
  // Plugin title
  plugin_title: string;

  // QAM (Quick Access Menu)
  brightness: string;
  volume: string;
  oc_mode: string;
  fan_mode: string;
  settings: string;
  loading: string;

  // Tab titles
  tab_system: string;
  tab_tdp: string;
  tab_utilities: string;
  tab_compatibility: string;
  tab_wifi: string;
  tab_bluetooth: string;

  // System tab
  brightness_label: string;
  volume_label: string;

  // Wi-Fi tab
  wifi_title: string;
  wifi_toggle: string;
  wifi_refresh: string;
  wifi_no_connection: string;
  wifi_available_networks: string;
  wifi_connect: string;
  wifi_disconnect: string;
  wifi_password: string;
  wifi_show_password: string;
  wifi_hide_password: string;
  wifi_connecting: string;
  wifi_connection_failed: string;
  wifi_wrong_password: string;
  wifi_enter_password: string;
  wifi_connected: string;
  wifi_network: string;
  wifi_secured: string;
  wifi_unsecured: string;
  wifi_show_all: string;

  // Bluetooth tab
  bluetooth_title: string;
  bluetooth_toggle: string;
  bluetooth_refresh: string;
  bluetooth_paired_devices: string;
  bluetooth_available_devices: string;
  bluetooth_no_devices: string;
  bluetooth_no_paired_devices: string;
  bluetooth_devices_found: string;
  bluetooth_connect: string;
  bluetooth_disconnect: string;
  bluetooth_pair: string;
  bluetooth_forget: string;
  bluetooth_connecting: string;
  bluetooth_connection_failed: string;
  bluetooth_paired: string;
  bluetooth_trusted: string;
  bluetooth_show_all: string;
  bluetooth_placeholder: string;
  bluetooth_scanning: string;

  // TDP tab
  tdp_title: string;
  cpu: string;
  gpu: string;
  battery: string;
  tdp_mode: string;
  fan_mode_label: string;
  tdp_console: string;
  tdp_handheld: string;
  tdp_oc_cpu: string;
  tdp_oc_gpu: string;
  tdp_oc_all: string;
  tdp_perf_all: string;
  tdp_perf_oc_all: string;
  fan_console: string;
  fan_handheld: string;
  fan_cool: string;

  // Utilities tab
  utilities_title: string;
  reboot_hekate: string;
  switch_desktop: string;
  confirm: string;

  // Compatibility tab
  compatibility_title: string;
  filters: string;
  search_games: string;
  show_installed_only: string;
  no_games_found: string;
  sync: string;
  syncing: string;
  back: string;
  game_filters: string;
  show_all: string;
  switch_model: string;
  switch_lite: string;
  switch_oled: string;
  switch_v1: string;
  switch_v2: string;
  oc_mode_filter: string;
  oc_mode_console: string;
  oc_mode_handheld: string;
  oc_mode_oc_cpu: string;
  oc_mode_oc_gpu: string;
  oc_mode_oc_all: string;
  oc_mode_perf_oc: string;
  oc_mode_perf_oc_all: string;
  rating_filter: string;
  rating_perfect: string;
  rating_playable: string;
  rating_unplayable: string;
  rating_unsupported: string;
  rating_unknown: string;
  compatibility_rating: string;
  recommended_oc_mode: string;
  average_fps: string;
  recommended_proton: string;
  launch_options: string;
  extra_info: string;
  submitted_by: string;
  copy_to_clipboard: string;
  copied: string;
  not_rated: string;

  // Filters
  switch_model_filter: string;
  oc_mode_filter_label: string;
  rating_filter_label: string;

  // Errors
  error_loading_games: string;
  error_loading_wifi: string;
  error_loading_bluetooth: string;
  error_connection_failed: string;
  error_wrong_password: string;
  error_timeout: string;
  error_permission_denied: string;
  error_no_network: string;

  // Placeholders
  placeholder_soon: string;
}

// ---------- Translations ----------
const defaultTranslations: Record<Language, Translations> = {
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

// ---------- Translation Context ----------
let currentLanguage: Language = "en";
let translations: Translations = defaultTranslations["en"];

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  translations = defaultTranslations[lang] || defaultTranslations["en"];
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: keyof Translations): string {
  return translations[key] || key;
}

export function tWithParams(
  key: keyof Translations,
  params: Record<string, string | number>
): string {
  let result = translations[key] || key;
  for (const [param, value] of Object.entries(params)) {
    result = result.replace(`{${param}}`, String(value));
  }
  return result;
}

export function detectLanguage(): Language {
  try {
    const steamLang = (window as any).SteamClient?.System?.GetSystemLanguage?.();
    if (steamLang) {
      const langMap: Record<string, Language> = {
        english: "en",
        russian: "ru",
        spanish: "es",
        french: "fr",
      };
      if (langMap[steamLang]) return langMap[steamLang];
    }
  } catch (e) {}

  const browserLang = navigator.language.split("-")[0] as Language;
  if (browserLang in defaultTranslations) return browserLang;

  return "en";
}

// ---------- React Hook ----------
export function useLanguage(): Translations {
  const [, setLang] = useState<Language>(currentLanguage);

  useEffect(() => {
    const detected = detectLanguage();
    setLanguage(detected);
    setLang(detected);
  }, []);

  return translations;
}

// ---------- Translate Rating Helper ----------
export function translateRating(rating: string): string {
  const ratingMap: Record<string, string> = {
    Perfect: t("rating_perfect"),
    Playable: t("rating_playable"),
    Unplayable: t("rating_unplayable"),
    Unsupported: t("rating_unsupported"),
    Unknown: t("rating_unknown"),
  };
  return ratingMap[rating] || rating;
}

export default t;
