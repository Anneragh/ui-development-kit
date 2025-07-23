import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ElectronApiFactoryService } from 'sailpoint-components';

export type ComponentInfo = {
  name: string;
  displayName: string;
  route: string;
  icon: string;
  description: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ComponentSelectorService {
  private STORAGE_KEY = 'enabledComponents';
  private isElectron = false;

  private availableComponents: ComponentInfo[] = [
    {
      name: 'transforms',
      displayName: 'Transforms',
      route: '/transforms',
      icon: 'transform',
      description: 'Manage data transformations for SailPoint.',
      enabled: true,
    },
    {
      name: 'theme-picker',
      displayName: 'Theme Picker',
      route: '/theme-picker',
      icon: 'palette',
      description: 'Manage theme picker in SailPoint.',
      enabled: false,
    },
    {
      name: 'report-example',
      displayName: 'Report Example',
      route: '/report-example',
      icon: 'insert_chart',
      description: 'Manage report example in SailPoint.',
      enabled: false,
    },
    {
      name: 'identities',
      displayName: 'Identities',
      route: '/identities',
      icon: 'assignment_ind',
      description: 'Manage identities in SailPoint.',
      enabled: false,
    },
  ];

  private enabledComponentsSubject = new BehaviorSubject<ComponentInfo[]>([]);
  enabledComponents$ = this.enabledComponentsSubject.asObservable();

  constructor(private apiFactoryService: ElectronApiFactoryService) {
    this.isElectron = this.apiFactoryService.getApi() === window.electronAPI;
    this.loadEnabledComponents()
      .then(() => {
        console.log('Components Loaded');
      })
      .catch((error) => {
        console.error('Failed to load enabled components:', error);
      });
  }

  getEnabledComponents(): ComponentInfo[] {
    return this.enabledComponentsSubject.getValue();
  }

  toggleComponent(componentName: ComponentInfo): void {
    const component = this.availableComponents.find(
      (c) => c.name === componentName.name
    );
    if (component) {
      component.enabled = !component.enabled;
      this.updateEnabledComponents();
    }
  }

  enableComponent(componentName: string): void {
    const component = this.availableComponents.find(
      (c) => c.name === componentName
    );
    if (component) {
      component.enabled = true;
      this.updateEnabledComponents();
    }
  }

  private updateEnabledComponents(): void {
    const enabledComponents = this.availableComponents; //.filter(c => c.enabled);
    this.enabledComponentsSubject.next(enabledComponents);
    this.saveEnabledComponents().catch((error) => {
      console.error('Failed to save enabled components:', error);
    });
  }

  private async saveEnabledComponents(): Promise<void> {
    try {
      const enabledNames = this.availableComponents
        .filter((component) => component.enabled)
        .map((component) => component.name);
      if (this.isElectron) {
        const config = await this.apiFactoryService.getApi().readConfig();
        config.components = { enabled: enabledNames };
        await this.apiFactoryService.getApi().writeConfig(config);
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
        const config = await this.apiFactoryService.getApi().readConfig();
        enabledNames = config.components?.enabled || [];
      } else {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        enabledNames = stored ? JSON.parse(stored) : [];
      }

      this.availableComponents.forEach((component) => {
        component.enabled = enabledNames.includes(component.name);
      });
    } catch (error) {
      console.error('Failed to load enabled components:', error);
    }
    this.updateEnabledComponents();
  }
}
