export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }
  
  export interface PWAInstallState {
    canInstall: boolean;
    isInstalled: boolean;
    promptInstall: () => Promise<void>;
  }