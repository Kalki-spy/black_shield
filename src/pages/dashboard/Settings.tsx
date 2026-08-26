import { Bell, Lock, Eye, Palette, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const SettingsPage = () => {
  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold font-mono text-foreground">Settings</h1>

      {/* Notifications */}
      <div className="neon-card rounded-lg p-6">
        <h3 className="font-mono font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notifications
        </h3>
        <div className="space-y-4">
          {[
            { label: "Email notifications", desc: "Receive alerts via email" },
            { label: "Push notifications", desc: "Browser push notifications" },
            { label: "Threat alerts", desc: "Immediate critical threat alerts" },
            { label: "Weekly digest", desc: "Weekly security summary" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="neon-card rounded-lg p-6">
        <h3 className="font-mono font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Security
        </h3>
        <div className="space-y-4">
          {[
            { label: "Two-factor authentication", desc: "Add extra security layer" },
            { label: "Session timeout", desc: "Auto logout after inactivity" },
            { label: "Login alerts", desc: "Notify on new device login" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch />
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="neon-card rounded-lg p-6">
        <h3 className="font-mono font-semibold text-foreground mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" /> Preferences
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-foreground block mb-2">Language</label>
            <select className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-foreground block mb-2">Timezone</label>
            <select className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary">
              <option>UTC</option>
              <option>EST (UTC-5)</option>
              <option>PST (UTC-8)</option>
              <option>IST (UTC+5:30)</option>
            </select>
          </div>
        </div>
      </div>

      <Button className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono">
        <Save className="h-4 w-4 mr-2" /> Save Changes
      </Button>
    </div>
  );
};

export default SettingsPage;
