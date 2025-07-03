import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

declare global {
    interface Window {
        electronAPI: {
            readConfig: () => Promise<any>;
            writeConfig: (config: any) => Promise<any>;
        };
    }
}

export interface ComponentInfo {
    name: string;
    displayName: string;
    route: string;
    icon: string;
    description: string;
    enabled: boolean;
}

@Injectable({
    providedIn: 'root'
})

export class ComponentSelectorService {
    private STORAGE_KEY = 'enabledComponents';
    private isElectron = typeof window !== 'undefined' && !!window.electronAPI;

    private availableComponents: ComponentInfo[] = [
        {
            name: 'transforms',
            displayName: 'Transforms',
            route: '/transforms',
            icon: 'transform',
            description: 'Manage data transformations for SailPoint.',
            enabled: true
        },
        {
            name: 'report-example',
            displayName: 'Report Example',
            route: '/report-example',
            icon: 'dashboard',
            description: 'Manage report example in SailPoint.',
            enabled: false
        }
    ];

    private enabledComponentsSubject = new BehaviorSubject<ComponentInfo[]>([]);
    enabledComponents$ = this.enabledComponentsSubject.asObservable();

    constructor() {
        this.loadEnabledComponents().then(() => {
            console.log('Components Loaded');
        }).catch(error => {
            console.error('Failed to load enabled components:', error);
        });
    }

    getEnabledComponents(): ComponentInfo[] {
        return this.enabledComponentsSubject.getValue();
    }

    toggleComponent(componentName: ComponentInfo): void {
        const component = this.availableComponents.find(c => c.name === componentName.name);
        if (component) {
            component.enabled = !component.enabled;
            this.updateEnabledComponents();
        }
    }

    enableComponent(componentName: string): void {
        const component = this.availableComponents.find(c => c.name === componentName);
        if (component) {
            component.enabled = true;
            this.updateEnabledComponents();
        }
    }

    private updateEnabledComponents(): void {
        const enabledComponents = this.availableComponents //.filter(c => c.enabled);
        this.enabledComponentsSubject.next(enabledComponents);
        this.saveEnabledComponents().catch(error => {
            console.error('Failed to save enabled components:', error);
        });
    }

    private async saveEnabledComponents(): Promise<void> {
        try {
            const enabledNames = this.availableComponents
                .filter(component => component.enabled)
                .map(component => component.name);
            if (this.isElectron) {
                const config = await window.electronAPI.readConfig();
                config.components = { enabled: enabledNames };
                await window.electronAPI.writeConfig(config);
            } else {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(enabledNames));
            }
        } catch (error) {
            console.error('Failed to save enabled components:', error);
        }
    }

    private async loadEnabledComponents(): Promise<void> {
        try {
            let enabledNames: string[] = [];
            if (this.isElectron) {
                const config = await window.electronAPI.readConfig();
                enabledNames = config.components?.enabled || [];
            } else {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                enabledNames = stored ? JSON.parse(stored) : [];
            }

            this.availableComponents.forEach(component => {
                component.enabled = enabledNames.includes(component.name);
            });
        } catch (error) {
            console.error('Failed to load enabled components:', error);
        }
        this.updateEnabledComponents();
    }
}