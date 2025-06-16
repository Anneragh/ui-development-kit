import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

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
    private readonly STORAGE_KEY = 'sailpoint-enabled-components';

    private availableComponents: ComponentInfo[] = [
        {
            name: 'transforms',
            displayName: 'Transforms',
            route: '/transforms',
            icon: 'transform',
            description: 'Manage data transformations for SailPoint.',
            enabled: true
        }
    ];

    private enabledComponentsSubject = new BehaviorSubject<ComponentInfo[]>([]);
    enabledComponents$ = this.enabledComponentsSubject.asObservable();

    constructor() {
        this.loadEnabledComponents();
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
        const enabledComponents = this.availableComponents.filter(c => c.enabled);
        this.enabledComponentsSubject.next(enabledComponents);
        this.saveEnabledComponents();
    }

    private saveEnabledComponents(): void {
        try {
            const enabledNames = this.availableComponents
                .filter(component => component.enabled)
                .map(component => component.name);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(enabledNames));
        } catch (error) {
            console.error('Failed to save enabled components:', error);
        }
    }

    private loadEnabledComponents(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const enabledNames = JSON.parse(stored) as string[];
                this.availableComponents.forEach(component => {
                    component.enabled = enabledNames.includes(component.name);
                });
            }
        } catch (error) {
            console.error('Failed to save enabled components:', error);
        }
        this.updateEnabledComponents();
    }
}