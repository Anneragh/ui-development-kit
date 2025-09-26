import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule, provideNzIconsPatch } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzBackTopModule } from 'ng-zorro-antd/back-top';
import { NzAffixModule } from 'ng-zorro-antd/affix';
import { NzAnchorModule } from 'ng-zorro-antd/anchor';
import { NavigationStackService } from '../navigation-stack';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { IdentityV2025 } from 'sailpoint-api-client';
import {
  MailOutline,
  UserOutline,
  TeamOutline,
  LeftOutline,
  ReloadOutline,
} from '@ant-design/icons-angular/icons';

@Component({
  selector: 'app-identity-info',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NzButtonModule,
    NzBreadCrumbModule,
    NzIconModule,
    NzDividerModule,
    NzDescriptionsModule,
    NzTagModule,
    NzTimelineModule,
    NzTableModule,
    NzEmptyModule,
    NzAlertModule,
    NzSpinModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzProgressModule,
    NzBadgeModule,
    NzToolTipModule,
    NzAvatarModule,
    NzSpaceModule,
    NzTypographyModule,
    NzResultModule,
    NzBackTopModule,
    NzAffixModule,
    NzAnchorModule,
  ],
  providers: [
    provideNzIconsPatch([
      MailOutline,
      UserOutline,
      TeamOutline,
      LeftOutline,
      ReloadOutline,
    ]),
  ],
  templateUrl: './identity-info.component.html',
  styleUrls: ['./identity-info.component.scss'],
})
export class IdentityInfoComponent implements OnInit, OnDestroy {
  @Input() identityId: string = '';

  identity: IdentityV2025 | null = null;
  loading = false;
  error: string | null = null;
  breadcrumbItems: any[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private sailPointSDKService: SailPointSDKService,
    private navigationStackService: NavigationStackService
  ) {}

  ngOnInit(): void {
    console.log(
      'IdentityInfoComponent ngOnInit - identityId:',
      this.identityId
    );
    this.setupBreadcrumb();
    void this.loadIdentity();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private setupBreadcrumb(): void {
    // Subscribe to navigation stack changes
    const stackSubscription = this.navigationStackService
      .getStackState()
      .subscribe((state) => {
        this.breadcrumbItems = state.items.map((item, index) => ({
          title: item.breadcrumb.label,
          icon: item.breadcrumb.icon,
          routerLink:
            index === state.currentLevel
              ? undefined
              : ['/certification-management'],
          queryParams:
            index === state.currentLevel ? undefined : { level: index },
        }));
      });

    this.subscriptions.push(stackSubscription);
  }

  private async loadIdentity(): Promise<void> {
    console.log('loadIdentity called with identityId:', this.identityId);

    if (!this.identityId) {
      this.error = 'No identity ID provided';
      console.log('No identity ID provided');
      return;
    }

    this.loading = true;
    this.error = null;
    console.log('Starting API call for identity:', this.identityId);

    try {
      const response = await this.sailPointSDKService.getIdentity({
        id: this.identityId,
      });
      console.log('API response received:', response);
      this.identity = response.data;
      this.loading = false;
    } catch (error) {
      console.error('API call failed:', error);
      this.error = `Failed to load identity details: ${String(error)}`;
      this.loading = false;
    }
  }

  /**
   * Navigate back to the previous level
   */
  goBack(): void {
    this.navigationStackService.pop();
  }

  /**
   * Navigate to a specific breadcrumb level
   */
  navigateToLevel(level: number): void {
    this.navigationStackService.navigateToLevel(level);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get status color for tags
   */
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'red';
      case 'pending':
        return 'orange';
      case 'suspended':
        return 'red';
      case 'locked':
        return 'red';
      default:
        return 'default';
    }
  }

  /**
   * Get processing state color for tags
   */
  getProcessingStateColor(state: string): string {
    switch (state?.toLowerCase()) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'pending':
        return 'orange';
      case 'processing':
        return 'blue';
      default:
        return 'default';
    }
  }

  /**
   * Get attribute value safely
   */
  getAttributeValue(key: string): string {
    if (!this.identity?.attributes) return 'N/A';
    return String(this.identity.attributes[key]) || 'N/A';
  }

  /**
   * Get all attribute keys for iteration
   */
  getAttributeKeys(): string[] {
    if (!this.identity || !this.identity.attributes) return [];
    return Object.keys(this.identity.attributes);
  }
}
