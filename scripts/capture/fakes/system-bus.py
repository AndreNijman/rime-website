#!/usr/bin/env python3
"""system-bus.py XML_DIR — NetworkManager and UPower for the captured shell.

The shell's bar reads Wi-Fi strength, connectivity and the battery straight
from NetworkManager and UPower on the SYSTEM bus (Quickshell.Networking,
Quickshell.Services.UPower). Left alone, a recording would show the capturing
machine's live signal and battery, and they would differ from take to take.
So the captured shell gets a private system bus (DBUS_SYSTEM_BUS_ADDRESS)
with these two services on it and nothing else.

The interfaces are the real ones: XML_DIR holds their introspection XML
(names and types only, see session.sh), so every property Quickshell asks for
exists. The values are canned and match fakes/nmcli's answers: one Wi-Fi card
associated with HomeNet at 82 %, Cafe Corner, Guest and Office in range, full
connectivity; a laptop battery at 80 % on battery power.
"""
import os, sys, uuid
from gi.repository import Gio, GLib

XML = sys.argv[1]
NM = "/org/freedesktop/NetworkManager"
DEV = f"{NM}/Devices/1"
AC = f"{NM}/ActiveConnection/1"
SET = f"{NM}/Settings"
APS = [("HomeNet", 82, 0x188, 5180), ("Cafe Corner", 61, 0x188, 2437), ("Guest", 44, 0, 2412), ("Office", 30, 0x388, 5745)]
AP = [f"{NM}/AccessPoint/{i + 1}" for i in range(len(APS))]
CONN = [f"{SET}/1", f"{SET}/2"]           # HomeNet, Office: saved
UUIDS = [str(uuid.uuid5(uuid.NAMESPACE_DNS, n)) for n in ("HomeNet", "Office")]
UP = "/org/freedesktop/UPower"
BAT = f"{UP}/devices/battery_BAT0"
DISP = f"{UP}/devices/DisplayDevice"

def ay(s): return GLib.Variant("ay", s.encode())

battery = {"Type": 2, "State": 2, "Percentage": 80.0, "IsPresent": True, "PowerSupply": True, "IsRechargeable": True,
           "Online": False, "IconName": "battery-full-symbolic", "TimeToEmpty": 5 * 3600 + 20 * 60, "TimeToFull": 0,
           "Energy": 64.0, "EnergyFull": 80.0, "EnergyFullDesign": 80.0, "EnergyRate": 12.0, "Voltage": 16.8,
           "Capacity": 100.0, "Technology": 2, "WarningLevel": 1, "BatteryLevel": 1, "NativePath": "BAT0",
           "Vendor": "Rime", "Model": "Battery", "HasHistory": False, "HasStatistics": False, "Luminosity": 0.0,
           "UpdateTime": 1790559660}

OBJECTS = {
    NM: {"org.freedesktop.NetworkManager": {
        "Devices": GLib.Variant("ao", [DEV]), "AllDevices": GLib.Variant("ao", [DEV]),
        "ActiveConnections": GLib.Variant("ao", [AC]), "PrimaryConnection": GLib.Variant("o", AC),
        "PrimaryConnectionType": "802-11-wireless", "ActivatingConnection": GLib.Variant("o", "/"),
        "Connectivity": GLib.Variant("u", 4), "ConnectivityCheckAvailable": True, "ConnectivityCheckEnabled": True,
        "ConnectivityCheckUri": "http://ping.example/", "NetworkingEnabled": True, "WirelessEnabled": True,
        "WirelessHardwareEnabled": True, "WwanEnabled": False, "WwanHardwareEnabled": False,
        "State": GLib.Variant("u", 70), "Startup": False, "Version": "1.54.0", "Metered": GLib.Variant("u", 4)}},
    SET: {"org.freedesktop.NetworkManager.Settings": {
        "Connections": GLib.Variant("ao", CONN), "Hostname": "rime", "CanModify": True}},
    DEV: {"org.freedesktop.NetworkManager.Device": {
            "Interface": "wlan0", "IpInterface": "wlan0", "Driver": "iwlwifi", "DeviceType": GLib.Variant("u", 2),
            "State": GLib.Variant("u", 100), "StateReason": GLib.Variant("(uu)", (100, 0)),
            "ActiveConnection": GLib.Variant("o", AC), "Managed": True, "Autoconnect": True, "Real": True,
            "AvailableConnections": GLib.Variant("ao", CONN), "Udi": "/sys/devices/virtual/net/wlan0",
            "HwAddress": "02:00:00:00:00:01", "Mtu": GLib.Variant("u", 1500), "Metered": GLib.Variant("u", 4),
            "Path": "pci-0000:02:00.0", "Ip4Connectivity": GLib.Variant("u", 4), "Ip6Connectivity": GLib.Variant("u", 4)},
          "org.freedesktop.NetworkManager.Device.Wireless": {
            "AccessPoints": GLib.Variant("ao", AP), "ActiveAccessPoint": GLib.Variant("o", AP[0]),
            "HwAddress": "02:00:00:00:00:01", "PermHwAddress": "02:00:00:00:00:01", "Mode": GLib.Variant("u", 2),
            "Bitrate": GLib.Variant("u", 866700), "WirelessCapabilities": GLib.Variant("u", 0x7ff),
            "LastScan": GLib.Variant("x", 1)}},
    AC: {"org.freedesktop.NetworkManager.Connection.Active": {
        "Connection": GLib.Variant("o", CONN[0]), "SpecificObject": GLib.Variant("o", AP[0]), "Id": "HomeNet",
        "Uuid": UUIDS[0], "Type": "802-11-wireless", "Devices": GLib.Variant("ao", [DEV]),
        "State": GLib.Variant("u", 2), "StateFlags": GLib.Variant("u", 0x5c), "Default": True, "Default6": False, "Vpn": False}},
    UP: {"org.freedesktop.UPower": {"DaemonVersion": "1.90.10", "OnBattery": True, "LidIsClosed": False, "LidIsPresent": True}},
    BAT: {"org.freedesktop.UPower.Device": dict(battery)},
    DISP: {"org.freedesktop.UPower.Device": dict(battery, NativePath="", Vendor="", Model="")},
}
for i, (ssid, strength, rsn, freq) in enumerate(APS):
    OBJECTS[AP[i]] = {"org.freedesktop.NetworkManager.AccessPoint": {
        "Ssid": ay(ssid), "Strength": GLib.Variant("y", strength), "Frequency": GLib.Variant("u", freq),
        "Flags": GLib.Variant("u", 1 if rsn else 0), "WpaFlags": GLib.Variant("u", 0), "RsnFlags": GLib.Variant("u", rsn),
        "Mode": GLib.Variant("u", 2), "MaxBitrate": GLib.Variant("u", 866700), "HwAddress": f"02:00:00:00:01:0{i + 1}",
        "Bandwidth": GLib.Variant("u", 80), "LastSeen": GLib.Variant("i", 1)}}
for i, name in enumerate(("HomeNet", "Office")):
    OBJECTS[CONN[i]] = {"org.freedesktop.NetworkManager.Settings.Connection": {
        "Unsaved": False, "Flags": GLib.Variant("u", 0), "Filename": f"/etc/NetworkManager/system-connections/{name}.nmconnection"}}

def settings(i):
    name = ("HomeNet", "Office")[i]
    return {"connection": {"id": GLib.Variant("s", name), "uuid": GLib.Variant("s", UUIDS[i]),
                           "type": GLib.Variant("s", "802-11-wireless"), "autoconnect": GLib.Variant("b", True)},
            "802-11-wireless": {"ssid": ay(name), "mode": GLib.Variant("s", "infrastructure")},
            "802-11-wireless-security": {"key-mgmt": GLib.Variant("s", "wpa-psk" if i == 0 else "wpa-eap")}}

METHODS = {
    ("org.freedesktop.NetworkManager", "GetDevices"): lambda p, a: GLib.Variant("(ao)", ([DEV],)),
    ("org.freedesktop.NetworkManager", "GetAllDevices"): lambda p, a: GLib.Variant("(ao)", ([DEV],)),
    ("org.freedesktop.NetworkManager", "CheckConnectivity"): lambda p, a: GLib.Variant("(u)", (4,)),
    ("org.freedesktop.NetworkManager", "GetPermissions"): lambda p, a: GLib.Variant("(a{ss})", ({},)),
    ("org.freedesktop.NetworkManager.Settings", "ListConnections"): lambda p, a: GLib.Variant("(ao)", (CONN,)),
    ("org.freedesktop.NetworkManager.Settings.Connection", "GetSettings"):
        lambda p, a: GLib.Variant("(a{sa{sv}})", (settings(CONN.index(p)),)),
    ("org.freedesktop.NetworkManager.Device.Wireless", "GetAccessPoints"): lambda p, a: GLib.Variant("(ao)", (AP,)),
    ("org.freedesktop.NetworkManager.Device.Wireless", "GetAllAccessPoints"): lambda p, a: GLib.Variant("(ao)", (AP,)),
    ("org.freedesktop.NetworkManager.Device.Wireless", "RequestScan"): lambda p, a: None,
    ("org.freedesktop.UPower", "EnumerateDevices"): lambda p, a: GLib.Variant("(ao)", ([BAT],)),
    ("org.freedesktop.UPower", "GetDisplayDevice"): lambda p, a: GLib.Variant("(o)", (DISP,)),
    ("org.freedesktop.UPower", "GetCriticalAction"): lambda p, a: GLib.Variant("(s)", ("PowerOff",)),
}

DEFAULTS = {"b": False, "s": "", "o": "/", "u": 0, "i": 0, "x": 0, "t": 0, "y": 0, "d": 0.0, "q": 0, "n": 0}

def default(sig):
    if sig in DEFAULTS: return GLib.Variant(sig, DEFAULTS[sig])
    if sig.startswith("a{"): return GLib.Variant(sig, {})
    if sig.startswith("a"): return GLib.Variant(sig, [])
    return None

def wrap(sig, v):
    if isinstance(v, GLib.Variant): return v
    return GLib.Variant(sig, v)

def interfaces(xml_file):
    return Gio.DBusNodeInfo.new_for_xml(open(xml_file).read()).interfaces

infos = {}
for f in os.listdir(XML):
    for iface in interfaces(os.path.join(XML, f)):
        infos[iface.name] = iface

def on_call(conn, sender, path, iface, method, params, inv):
    fn = METHODS.get((iface, method))
    if fn is None:
        inv.return_dbus_error("org.freedesktop.DBus.Error.NotSupported", f"{iface}.{method} is not faked")
        return
    inv.return_value(fn(path, params))

def on_get(conn, sender, path, iface, prop):
    vals = OBJECTS.get(path, {}).get(iface, {})
    sig = next((p.signature for p in infos[iface].properties if p.name == prop), "s")
    return wrap(sig, vals[prop]) if prop in vals else default(sig)

def on_bus(conn, name):
    for path, ifaces in OBJECTS.items():
        for iface in ifaces:
            conn.register_object(path, infos[iface], on_call, on_get, None)
    # ObjectManager-less clients enumerate from the roots above.

owner_ids = []
def main():
    loop = GLib.MainLoop()
    conn = Gio.bus_get_sync(Gio.BusType.SYSTEM, None)
    on_bus(conn, None)
    for name in ("org.freedesktop.NetworkManager", "org.freedesktop.UPower"):
        owner_ids.append(Gio.bus_own_name_on_connection(conn, name, Gio.BusNameOwnerFlags.NONE, None, None))
    print("system-bus: NetworkManager and UPower up", flush=True)
    loop.run()

main()
