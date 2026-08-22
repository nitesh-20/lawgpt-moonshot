import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, User, Settings, LogOut, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MorphPanel } from "@/components/ui/ai-input";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  isOnline?: boolean;
  collapsed?: boolean;
}

const Header = ({ isOnline = true, collapsed = false }: HeaderProps) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New hearing scheduled",
      description: "Smith v. Johnson case hearing on 10/15/2026",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      title: "Document ready for review",
      description: "Legal brief for Williams v. Tech Corp is ready",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      title: "Compliance alert",
      description: "New regulations affecting your active documents",
      time: "3 days ago",
      read: true,
    },
  ]);

  const isMobile = useIsMobile();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="fixed top-0 right-0 left-0 bg-white/80 backdrop-blur-md border-b border-border z-30">
      <div
        className={`flex h-20 items-center justify-between px-6 md:px-8 transition-all duration-300 ${
          isMobile ? "ml-0" : (collapsed ? "ml-20" : "ml-60")
        }`}
      >
        {/* Sleek Search trigger styling */}
        <div className="flex items-center">
          <button 
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              document.dispatchEvent(e);
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-50 border border-border text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Command Menu</span>
            <kbd className="inline-flex h-4 select-none items-center gap-0.5 rounded bg-neutral-200 px-1 font-mono text-[9px] font-medium text-neutral-600 ml-2">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {!isOnline && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              <span className="text-slate-455 font-mono text-2xs uppercase tracking-wider font-bold">
                Offline Mode
              </span>
            </div>
          )}

          {isOnline && <MorphPanel />}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded transition-all"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white border border-border text-neutral-900 shadow-lg">
              <DropdownMenuLabel className="flex items-center justify-between font-sans text-xs">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    className="text-xs h-auto p-1 text-primary hover:text-primary-foreground hover:bg-primary/10"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start py-2.5 px-3 focus:bg-neutral-50 cursor-pointer ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="font-semibold text-xs text-neutral-900">{notification.title}</div>
                    <div className="text-2xs text-neutral-500 mt-0.5 leading-relaxed">
                      {notification.description}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                      {notification.time}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="focus:bg-neutral-50">
                <Link to="/dashboard" className="w-full text-center text-xs font-semibold text-primary py-1 cursor-pointer">
                  View all in Command Center
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full hover:bg-neutral-50"
              >
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary text-white font-sans text-xs font-bold">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-border text-neutral-900 w-48 shadow-lg">
              <DropdownMenuLabel className="font-sans text-xs">John Doe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="focus:bg-neutral-50 cursor-pointer text-xs">
                <User className="mr-2.5 h-4 w-4 text-neutral-500" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-neutral-50 cursor-pointer text-xs">
                <Settings className="mr-2.5 h-4 w-4 text-neutral-500" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="focus:bg-neutral-50 text-destructive focus:text-destructive cursor-pointer text-xs">
                <LogOut className="mr-2.5 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
