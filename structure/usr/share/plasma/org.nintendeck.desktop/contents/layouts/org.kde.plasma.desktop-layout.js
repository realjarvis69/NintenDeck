loadTemplate("org.kde.plasma.desktop.defaultPanel")

var widgets = panel.widgets();
for (var i = 0; i < widgets.length; i++) {
    if (widgets[i].type === "org.kde.plasma.kickoff") {
        widgets[i].currentConfigGroup = ["General"];
        widgets[i].writeConfig("icon", "/usr/share/icons/NintenDeck/logo.png")
    }
}

var desktopsArray = desktopsForActivity(currentActivity());
for( var j = 0; j < desktopsArray.length; j++) {
    desktopsArray[j].wallpaperPlugin = 'org.kde.image';
}
