import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { NavigationStackService, NavigationItem } from '../navigation-stack';
import {
  IdentityCertificationDtoV2025,
  IdentityReferenceWithNameAndEmailV2025,
  AccessReviewItemV2025,
  CertificationDecisionV2025,
} from 'sailpoint-api-client';
import {
  NzTableModule,
  NzTableSortFn,
  NzTableSortOrder,
  NzTableFilterFn,
} from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzUploadModule } from 'ng-zorro-antd/upload';

// Interface for comprehensive certification details
interface CertificationDetails {
  certification: IdentityCertificationDtoV2025;
  reviewers: any[];
  accessReviewItems: any[];
  errors?: string[];
}

// Interface for access review item column configuration
interface AccessReviewColumnItem {
  name: string;
  sortOrder: NzTableSortOrder | null;
  sortFn: NzTableSortFn<any> | null;
  sortDirections: NzTableSortOrder[];
  filterMultiple: boolean;
  listOfFilter: Array<{ text: string; value: string; byDefault?: boolean }>;
  filterFn: NzTableFilterFn<any> | null;
  dataAccessor?: (item: any) => any;
  formatter?: (value: any) => string;
  cssClass?: (value: any) => string;
}

@Component({
  selector: 'app-certification-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzToolTipModule,
    NzProgressModule,
    NzStatisticModule,
    NzTimelineModule,
    NzSelectModule,
    NzUploadModule,
  ],
  templateUrl: './certification-detail.component.html',
  styleUrl: './certification-detail.component.scss',
})
export class CertificationDetailComponent implements OnInit, OnDestroy {
  @Input() certificationId!: string;
  @Input() onBack!: () => void;
  @Input() breadcrumbLabel?: string;

  @Output() decisionsSaved = new EventEmitter<number>();

  private subscriptions = new Subscription();
  loading = false;
  certificationDetails: CertificationDetails | null = null;
  error: string | null = null;

  // Track editing state for decision column
  editingDecisionId: string | null = null;

  // Track all changes made to decisions
  decisionChanges: Map<string, string> = new Map();

  // Bulk action state management
  bulkActionMode: boolean = false;
  bulkActionDecision: string = 'APPROVE';
  setOfCheckedId = new Set<string>();
  checked = false;
  indeterminate = false;
  listOfCurrentPageData: readonly any[] = [];
  bulkActionLoading = false;

  deadline: number = 0; // For countdown component
  isOverdue: boolean = false; // Track if certification is overdue

  // Access review items table configuration
  accessReviewColumns: AccessReviewColumnItem[] = [
    {
      name: 'Identity',
      sortOrder: null,
      sortFn: (a: AccessReviewItemV2025, b: AccessReviewItemV2025) => {
        const nameA = a.identitySummary?.name || '';
        const nameB = b.identitySummary?.name || '';
        return nameA.localeCompare(nameB);
      },
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: AccessReviewItemV2025) =>
        list &&
        Array.isArray(list) &&
        list.some(
          (name) =>
            (item.identitySummary?.name || '')
              .toLowerCase()
              .indexOf(name.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => item.identitySummary?.name,
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Access Type',
      sortOrder: null,
      sortFn: (a: AccessReviewItemV2025, b: AccessReviewItemV2025) => {
        const getAccessType = (item: AccessReviewItemV2025) => {
          if (item.accessSummary?.entitlement) return 'Entitlement';
          if (item.accessSummary?.accessProfile) return 'Access Profile';
          if (item.accessSummary?.role) return 'Role';
          return 'Unknown';
        };
        const typeA = getAccessType(a);
        const typeB = getAccessType(b);
        return typeA.localeCompare(typeB);
      },
      sortDirections: ['ascend', 'descend'],
      filterMultiple: false,
      listOfFilter: [
        { text: 'Entitlement', value: 'Entitlement' },
        { text: 'Access Profile', value: 'Access Profile' },
        { text: 'Role', value: 'Role' },
      ],
      filterFn: null,
      dataAccessor: (item) => {
        if (item.accessSummary?.entitlement) return 'Entitlement';
        if (item.accessSummary?.accessProfile) return 'Access Profile';
        if (item.accessSummary?.role) return 'Role';
        return 'Unknown';
      },
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Access Name',
      sortOrder: null,
      sortFn: (a: AccessReviewItemV2025, b: AccessReviewItemV2025) => {
        const getName = (item: AccessReviewItemV2025) => {
          return (
            item.accessSummary?.entitlement?.name ||
            item.accessSummary?.accessProfile?.name ||
            item.accessSummary?.role?.name ||
            'N/A'
          );
        };
        const nameA = getName(a);
        const nameB = getName(b);
        return nameA.localeCompare(nameB);
      },
      sortDirections: ['ascend', 'descend'],
      filterMultiple: false,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => {
        return (
          item.accessSummary?.entitlement?.name ||
          item.accessSummary?.accessProfile?.name ||
          item.accessSummary?.role?.name ||
          'N/A'
        );
      },
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Source',
      sortOrder: null,
      sortFn: (a: AccessReviewItemV2025, b: AccessReviewItemV2025) => {
        const getSource = (item: AccessReviewItemV2025) => {
          return (
            item.accessSummary?.entitlement?.sourceName ||
            item.accessSummary?.accessProfile?.entitlements?.[0]?.sourceName ||
            item.accessSummary?.role?.entitlements?.[0]?.sourceName ||
            'N/A'
          );
        };
        const sourceA = getSource(a);
        const sourceB = getSource(b);
        return sourceA.localeCompare(sourceB);
      },
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: AccessReviewItemV2025) =>
        list &&
        Array.isArray(list) &&
        list.some(
          (source) =>
            (item.accessSummary?.entitlement?.sourceName || '')
              .toLowerCase()
              .indexOf(source.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => {
        return (
          item.accessSummary?.entitlement?.sourceName ||
          item.accessSummary?.accessProfile?.entitlements?.[0]?.sourceName ||
          item.accessSummary?.role?.entitlements?.[0]?.sourceName ||
          'N/A'
        );
      },
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Completed',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: false,
      listOfFilter: [
        { text: 'Yes', value: 'Yes' },
        { text: 'No', value: 'No' },
      ],
      filterFn: (list: string[], item: AccessReviewItemV2025) => {
        if (!list || list.length === 0) return true;
        const itemStatus = item.completed ? 'Yes' : 'No';
        return list.includes(itemStatus);
      },
      dataAccessor: (item) => item.completed,
      formatter: (value) => (value ? 'Yes' : 'No'),
      cssClass: (value) => (value ? 'status-completed' : 'status-pending'),
    },
    {
      name: 'New Access',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: false,
      listOfFilter: [
        { text: 'Yes', value: 'Yes' },
        { text: 'No', value: 'No' },
      ],
      filterFn: (list: string[], item: AccessReviewItemV2025) => {
        if (!list || list.length === 0) return true;
        const itemStatus = item.newAccess ? 'Yes' : 'No';
        return list.includes(itemStatus);
      },
      dataAccessor: (item) => item.newAccess,
      formatter: (value) => (value ? 'Yes' : 'No'),
      cssClass: (value) => (value ? 'new-access-true' : 'new-access-false'),
    },
    {
      name: 'Comments',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.comments,
      formatter: (value) => value || '-',
      cssClass: (value) => (value ? 'comments-cell' : 'no-comments'),
    },
    {
      name: 'Decision',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [
        { text: 'APPROVE', value: 'APPROVE' },
        { text: 'REVOKED', value: 'REVOKED' },
        { text: 'PENDING', value: 'PENDING' },
      ],
      filterFn: (list: string[], item: AccessReviewItemV2025) =>
        list &&
        Array.isArray(list) &&
        list.some(
          (decision) =>
            (item.decision || 'PENDING').toUpperCase() ===
            decision.toUpperCase()
        ),
      dataAccessor: (item) => item.decision,
      formatter: (value) => value || 'PENDING',
      cssClass: (value) => {
        switch (value?.toUpperCase()) {
          case 'APPROVE':
            return 'decision-approve';
          case 'REVOKED':
            return 'decision-revoke';
          default:
            return 'decision-pending';
        }
      },
    },
    {
      name: 'Actions',
      sortOrder: null,
      sortFn: null,
      sortDirections: [],
      filterMultiple: false,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item,
      formatter: (value) => '',
      cssClass: () => 'actions-column',
    },
  ];

  constructor(
    private sdk: SailPointSDKService,
    private navStack: NavigationStackService
  ) {}

  ngOnInit() {
    if (this.certificationId) {
      this.loadCertificationDetails();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    // Clear maps to prevent memory leaks
    this.decisionChanges.clear();
    this.setOfCheckedId.clear();
  }

  /**
   * Load comprehensive certification details
   */
  async loadCertificationDetails(): Promise<void> {
    if (!this.certificationId) {
      this.error = 'Certification ID is required';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Initialize certification details structure
      const certificationDetails: CertificationDetails = {
        certification: {} as IdentityCertificationDtoV2025,
        reviewers: [],
        accessReviewItems: [],
        errors: [],
      };

      // Collect all data with proper error handling
      const promises = [
        this.fetchCertificationDetails(this.certificationId),
        this.fetchReviewers(this.certificationId),
        this.fetchAccessReviewItems(this.certificationId),
      ];

      // Wait for all promises to complete (some may fail)
      const results = await Promise.allSettled(promises);

      // Process results and handle any errors
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          switch (index) {
            case 0: // Certification details
              certificationDetails.certification =
                result.value as IdentityCertificationDtoV2025;
              break;
            case 1: // Reviewers
              certificationDetails.reviewers =
                result.value as IdentityReferenceWithNameAndEmailV2025[];
              break;
            case 2: // Access review items
              certificationDetails.accessReviewItems =
                result.value as AccessReviewItemV2025[];
              break;
          }
        } else {
          const errorMessage = `Failed to fetch ${
            ['certification details', 'reviewers', 'access review items'][index]
          }: ${result.reason}`;
          certificationDetails.errors?.push(errorMessage);
          console.error(errorMessage);
        }
      });

      this.certificationDetails = certificationDetails;

      // Populate filter options for access review items
      this.populateAccessReviewFilterOptions();

      // Calculate deadline for countdown (convert due date to timestamp)
      if (certificationDetails.certification.due) {
        const dueDate = new Date(certificationDetails.certification.due);
        this.deadline = dueDate.getTime();
        this.isOverdue = dueDate < new Date(); // Check if due date has passed
      }
    } catch (error) {
      this.error = `Failed to load certification details: ${String(error)}`;
      console.error('Error loading certification details:', error);
    } finally {
      this.loading = false;
    }
  }

  // Helper method to fetch certification details
  private async fetchCertificationDetails(
    certificationId: string
  ): Promise<IdentityCertificationDtoV2025> {
    try {
      const response = await this.sdk.getIdentityCertification({
        id: certificationId,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Certification details: ${String(error)}`);
    }
  }

  // Helper method to fetch reviewers
  private async fetchReviewers(certificationId: string): Promise<any[]> {
    try {
      const response = await this.sdk.listCertificationReviewers({
        id: certificationId,
      });
      return response.data || [];
    } catch (error) {
      throw new Error(`Reviewers: ${String(error)}`);
    }
  }

  // Helper method to fetch access review items
  private async fetchAccessReviewItems(
    certificationId: string
  ): Promise<any[]> {
    try {
      const response = await this.sdk.listIdentityAccessReviewItems({
        id: certificationId,
      });
      return response.data || [];
    } catch (error) {
      throw new Error(`Access review items: ${String(error)}`);
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  /**
   * Get status display text
   */
  getStatusText(): string {
    if (!this.certificationDetails?.certification) return 'Loading...';
    return this.certificationDetails.certification.completed
      ? 'Completed'
      : 'Pending';
  }

  /**
   * Get status CSS class
   */
  getStatusClass(): string {
    if (!this.certificationDetails?.certification) return '';
    return this.certificationDetails.certification.completed
      ? 'status-completed'
      : 'status-pending';
  }

  /**
   * Track by function for access review items
   */
  trackByAccessReviewId(index: number, item: any): string {
    return item.id || index.toString();
  }

  /**
   * Calculate progress percentage for identities
   */
  getIdentitiesProgressPercent(): number {
    if (!this.certificationDetails?.certification) return 0;
    const completed =
      this.certificationDetails.certification.identitiesCompleted || 0;
    const total = this.certificationDetails.certification.identitiesTotal || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  /**
   * Calculate progress percentage for decisions
   */
  getDecisionsProgressPercent(): number {
    if (!this.certificationDetails?.certification) return 0;
    const made = this.certificationDetails.certification.decisionsMade || 0;
    const total = this.certificationDetails.certification.decisionsTotal || 0;
    return total > 0 ? Math.round((made / total) * 100) : 0;
  }

  /**
   * Get progress status for identities
   */
  getIdentitiesProgressStatus(): string {
    const percent = this.getIdentitiesProgressPercent();
    if (percent === 100) return 'success';
    if (percent >= 80) return 'active';
    if (percent >= 50) return 'normal';
    return 'exception';
  }

  /**
   * Get progress status for decisions
   */
  getDecisionsProgressStatus(): string {
    const percent = this.getDecisionsProgressPercent();
    if (percent === 100) return 'success';
    if (percent >= 80) return 'active';
    if (percent >= 50) return 'normal';
    return 'exception';
  }

  /**
   * Get number of days overdue
   */
  getDaysOverdue(): number {
    if (!this.isOverdue || !this.certificationDetails?.certification.due) {
      return 0;
    }
    const dueDate = new Date(this.certificationDetails.certification.due);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get current breadcrumb label from navigation stack
   * This provides an alternative way to access the breadcrumb label
   */
  getCurrentBreadcrumbLabel(): string {
    const currentItem = this.navStack.peek();
    return currentItem?.breadcrumb?.label || 'Certification Details';
  }

  /**
   * Get all breadcrumb items for display
   */
  getAllBreadcrumbs(): any[] {
    return this.navStack.getBreadcrumbs();
  }

  /**
   * Get color for status tag
   */
  getStatusColor(): string {
    if (!this.certificationDetails?.certification) return 'default';
    return this.certificationDetails.certification.completed
      ? 'green'
      : 'orange';
  }

  /**
   * Get color for phase tag
   */
  getPhaseColor(): string {
    if (!this.certificationDetails?.certification?.phase) return 'default';
    const phase = this.certificationDetails.certification.phase.toLowerCase();

    switch (phase) {
      case 'active':
        return 'blue';
      case 'completed':
        return 'green';
      case 'pending':
        return 'orange';
      case 'cancelled':
        return 'red';
      case 'expired':
        return 'red';
      default:
        return 'default';
    }
  }

  /**
   * Get CSS class for phase indicator
   */
  getPhaseClass(): string {
    if (!this.certificationDetails?.certification?.phase)
      return 'phase-default';
    const phase = this.certificationDetails.certification.phase.toLowerCase();

    switch (phase) {
      case 'active':
        return 'phase-active';
      case 'completed':
        return 'phase-completed';
      case 'pending':
        return 'phase-pending';
      case 'cancelled':
        return 'phase-cancelled';
      case 'expired':
        return 'phase-expired';
      default:
        return 'phase-default';
    }
  }

  /**
   * Get countdown format based on remaining time
   */
  getCountdownFormat(): string {
    if (!this.deadline) return 'H:mm:ss';

    const now = new Date().getTime();
    const remaining = this.deadline - now;

    if (remaining <= 0) return 'H:mm:ss';

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let format = '';

    if (days > 0) {
      format += 'D day ';
    }

    if (hours > 0 || days > 0) {
      format += 'HH:';
    }

    if (minutes > 0 || hours > 0 || days > 0) {
      format += 'mm:';
    }

    format += 'ss';

    return format.trim();
  }

  /**
   * Check if there is reassignment data
   */
  hasReassignment(): boolean {
    return !!this.certificationDetails?.certification?.reassignment;
  }

  /**
   * Get the name of the reviewer who was reassigned from
   */
  getReassignmentFromName(): string {
    return (
      this.certificationDetails?.certification?.reassignment?.from?.reviewer
        ?.name || 'N/A'
    );
  }

  /**
   * Get the email of the reviewer who was reassigned from
   */
  getReassignmentFromEmail(): string {
    return (
      this.certificationDetails?.certification?.reassignment?.from?.reviewer
        ?.email || ''
    );
  }

  /**
   * Get the creation timestamp of the reassignment
   */
  getReassignmentCreated(): string {
    return (
      this.certificationDetails?.certification?.reassignment?.from?.reviewer
        ?.created || ''
    );
  }

  /**
   * Get the reassignment comment
   */
  getReassignmentComment(): string {
    return (
      this.certificationDetails?.certification?.reassignment?.comment || ''
    );
  }

  /**
   * View identity details
   */
  viewIdentity(identityId: string, name: string): void {
    console.log('viewIdentity called with identityId:', identityId);
    if (identityId) {
      // Push identity info to navigation stack
      const identityNavItem: NavigationItem = {
        id: `identity-${identityId}`,
        title: `Identity Details: ${name}`,
        component: 'identity-info',
        data: { identityId },
        breadcrumb: {
          label: `Identity Details: ${name}`,
          icon: 'user',
        },
      };

      console.log('Pushing identity navigation item:', identityNavItem);
      this.navStack.push(identityNavItem);
    }
  }

  /**
   * View access details
   */
  viewAccessDetail(accessReviewItem: any): void {
    if (accessReviewItem) {
      console.log('View access detail:', accessReviewItem);

      // Create navigation item for access detail
      const accessNavItem = {
        id: `access-detail-${accessReviewItem.id}`,
        title: `Access Details: ${
          accessReviewItem.accessSummary?.access?.name || 'Unknown Access'
        }`,
        component: 'access-detail',
        data: accessReviewItem,
        breadcrumb: {
          label: `Access Details: ${
            accessReviewItem.accessSummary?.access?.name || 'Unknown Access'
          }`,
          icon: this.getAccessTypeIcon(
            accessReviewItem.accessSummary?.access?.type
          ),
        },
        metadata: {
          accessType: accessReviewItem.accessSummary?.access?.type,
          accessId: accessReviewItem.accessSummary?.access?.id,
          identityName: accessReviewItem.identitySummary?.name,
        },
      };

      console.log('Pushing access navigation item:', accessNavItem);
      this.navStack.push(accessNavItem);
    }
  }

  /**
   * Get access type icon based on access type
   */
  private getAccessTypeIcon(accessType: string): string {
    switch (accessType) {
      case 'ENTITLEMENT':
        return 'key';
      case 'ACCESS_PROFILE':
        return 'profile';
      case 'ROLE':
        return 'team';
      default:
        return 'question-circle';
    }
  }

  /**
   * Handle decision change
   */
  onDecisionChange(newDecision: string, itemId: string): void {
    if (!itemId) {
      console.warn('No item ID provided for decision change');
      return;
    }

    // Update the item in the data
    const item = this.certificationDetails?.accessReviewItems.find(
      (i) => i.id === itemId
    );
    if (item) {
      item.decision = newDecision;
    }

    // Only track non-PENDING decisions in the changes map
    if (newDecision === 'PENDING') {
      // Remove from changes map if it exists (reverting to default state)
      this.decisionChanges.delete(itemId);
    } else {
      // Store the change for APPROVE/REVOKE decisions
      this.decisionChanges.set(itemId, newDecision);
    }

    console.log('Decision changed:', {
      itemId,
      newDecision,
      allChanges: Array.from(this.decisionChanges.entries()),
    });
  }

  /**
   * Get current decision for an item (including pending changes)
   */
  getCurrentDecision(itemId: string): string {
    try {
      // Check pending changes first
      if (this.decisionChanges.has(itemId)) {
        return this.decisionChanges.get(itemId) || 'PENDING';
      }

      // Fall back to current item decision (which may have been reset to original)
      const item = this.certificationDetails?.accessReviewItems?.find(
        (i) => i.id === itemId
      );
      return item?.decision || 'PENDING';
    } catch (error) {
      console.error('Error getting current decision:', error);
      return 'PENDING';
    }
  }

  /**
   * Save all decision changes (placeholder for API call)
   */
  async saveDecisionChanges(): Promise<void> {
    if (this.decisionChanges.size === 0) {
      console.log('No changes to save');
      return;
    }

    const changeCount = this.decisionChanges.size;
    console.log(
      'Saving decision changes:',
      Array.from(this.decisionChanges.entries())
    );

    this.loading = true;
    try {
      const response = await this.sdk.makeIdentityDecision({
        id: this.certificationDetails?.certification.id!,
        reviewDecisionV2025: Array.from(this.decisionChanges.entries()).map(
          ([id, decision]) => ({
            id: id,
            decision: decision as CertificationDecisionV2025,
            bulk: true,
          })
        ),
      });
      console.log('Decision changes saved successfully');

      // Emit the number of decisions saved for joke button tracking
      this.decisionsSaved.emit(changeCount);
    } catch (error) {
      console.error('Error saving decision changes:', error);
    } finally {
      this.loading = false;
    }
    this.decisionChanges.clear();

    // Show success message or handle errors
    console.log('Decision changes saved successfully');

    // Reload the certification details to get updated data
    await this.loadCertificationDetails();
  }

  /**
   * Check if there are any pending changes
   */
  hasPendingChanges(): boolean {
    return this.decisionChanges.size > 0;
  }

  /**
   * Clear all decision changes
   */
  clearAllDecisionChanges(): void {
    if (this.decisionChanges.size === 0) {
      console.log('No changes to clear');
      return;
    }

    console.log(
      'Clearing all decision changes:',
      Array.from(this.decisionChanges.entries())
    );

    // Reset all items back to their original decisions (default to 'PENDING')
    if (this.certificationDetails?.accessReviewItems) {
      this.certificationDetails.accessReviewItems.forEach((item) => {
        if (item.id && this.decisionChanges.has(item.id)) {
          // Reset to default decision (PENDING)
          item.decision = 'PENDING';
        }
      });
    }

    // Clear the decision changes map
    this.decisionChanges.clear();

    console.log('All decision changes cleared successfully');
  }

  /**
   * Get decision display value for an item (optimized for template)
   */
  getDecisionDisplayValue(item: any): string {
    try {
      if (!item || !item.id) {
        return 'PENDING';
      }
      return this.decisionChanges.get(item.id) || item.decision || 'PENDING';
    } catch (error) {
      console.error('Error getting decision display value:', error);
      return 'PENDING';
    }
  }

  /**
   * Get decision display class for an item (optimized for template)
   */
  getDecisionDisplayClass(item: any): string {
    try {
      if (!item) {
        return '';
      }
      const currentDecision = this.getDecisionDisplayValue(item);
      const column = this.accessReviewColumns.find(
        (col) => col.name === 'Decision'
      );
      const baseClass = column?.cssClass
        ? column.cssClass(currentDecision)
        : '';
      const completedClass = item.completed ? ' completed-readonly' : '';
      return baseClass + completedClass;
    } catch (error) {
      console.error('Error getting decision display class:', error);
      return '';
    }
  }

  /**
   * Populate filter options dynamically based on the access review items data
   * This ensures filter options are always based on the complete dataset
   */
  private populateAccessReviewFilterOptions(): void {
    if (!this.certificationDetails?.accessReviewItems) {
      return;
    }

    this.accessReviewColumns.forEach((column) => {
      // Skip columns that don't have dataAccessor or already have predefined filters
      if (!column.dataAccessor || column.listOfFilter.length > 0) {
        return;
      }

      // Get unique values for this column from the access review items data
      const values = [
        ...new Set(
          this.certificationDetails!.accessReviewItems.map((item) => {
            const value = column.dataAccessor!(item);
            // Convert to string for filtering, handle different data types
            if (value === null || value === undefined) return null;
            if (typeof value === 'object' && value instanceof Date) {
              return value.toISOString();
            }
            return value.toString();
          }).filter((value): value is string => Boolean(value))
        ),
      ];

      // Update filter options for this column
      column.listOfFilter = values.map((value) => ({
        text: value!,
        value: value!,
      }));
    });
  }

  /**
   * Toggle bulk action mode
   */
  toggleBulkActionMode(): void {
    this.bulkActionMode = !this.bulkActionMode;
    if (!this.bulkActionMode) {
      // Clear selections when exiting bulk mode
      this.setOfCheckedId.clear();
      this.checked = false;
      this.indeterminate = false;
    }
  }

  /**
   * Update checked set for bulk actions
   */
  updateCheckedSet(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
  }

  /**
   * Handle current page data change for bulk actions
   */
  onCurrentPageDataChange(listOfCurrentPageData: readonly any[]): void {
    this.listOfCurrentPageData = listOfCurrentPageData;
    this.refreshCheckedStatus();
  }

  /**
   * Refresh checked status for bulk actions
   */
  refreshCheckedStatus(): void {
    const listOfEnabledData = this.listOfCurrentPageData.filter(
      (item) => !item.completed
    );
    this.checked = listOfEnabledData.every((item) =>
      this.setOfCheckedId.has(item.id)
    );
    this.indeterminate =
      listOfEnabledData.some((item) => this.setOfCheckedId.has(item.id)) &&
      !this.checked;
  }

  /**
   * Handle item checked for bulk actions
   */
  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }

  /**
   * Handle all items checked for bulk actions
   */
  onAllChecked(checked: boolean): void {
    this.listOfCurrentPageData
      .filter((item) => !item.completed)
      .forEach((item) => this.updateCheckedSet(item.id, checked));
    this.refreshCheckedStatus();
  }

  /**
   * Apply bulk decision to selected items
   */
  async applyBulkDecision(): Promise<void> {
    if (this.setOfCheckedId.size === 0) {
      console.log('No items selected for bulk action');
      return;
    }

    this.bulkActionLoading = true;

    try {
      // Update decision changes for all selected items
      this.setOfCheckedId.forEach((itemId) => {
        this.decisionChanges.set(itemId, this.bulkActionDecision);

        // Also update the item in the data
        const item = this.certificationDetails?.accessReviewItems.find(
          (i) => i.id === itemId
        );
        if (item) {
          item.decision = this.bulkActionDecision;
        }
      });

      console.log(
        `Applied ${this.bulkActionDecision} to ${this.setOfCheckedId.size} items`
      );

      // Clear selections
      this.setOfCheckedId.clear();
      this.refreshCheckedStatus();
    } catch (error) {
      console.error('Error applying bulk decision:', error);
    } finally {
      this.bulkActionLoading = false;
    }
  }

  /**
   * Check if an item is disabled for bulk selection
   */
  isItemDisabledForBulkSelection(item: any): boolean {
    return item.completed || this.isCertificationStaged();
  }

  /**
   * Check if bulk action button should be disabled
   */
  isBulkActionDisabled(): boolean {
    return (
      this.setOfCheckedId.size === 0 ||
      this.bulkActionLoading ||
      this.isCertificationStaged()
    );
  }

  /**
   * Check if certification is in STAGED phase
   */
  isCertificationStaged(): boolean {
    return (
      this.certificationDetails?.certification?.phase?.toUpperCase() ===
      'STAGED'
    );
  }

  /**
   * Check if decision select should be disabled
   */
  isDecisionSelectDisabled(item: any): boolean {
    return item.completed || this.isCertificationStaged();
  }

  /**
   * Check if all decisions are made
   */
  areAllDecisionsMade(): boolean {
    if (!this.certificationDetails?.certification) return false;
    const made = this.certificationDetails.certification.decisionsMade || 0;
    const total = this.certificationDetails.certification.decisionsTotal || 0;
    return total > 0 && made >= total;
  }

  /**
   * Check if certification is in active phase
   */
  isCertificationActive(): boolean {
    return (
      this.certificationDetails?.certification?.phase?.toUpperCase() ===
      'ACTIVE'
    );
  }

  /**
   * Check if sign-off button should be shown
   */
  shouldShowSignOffButton(): boolean {
    return (
      this.areAllDecisionsMade() &&
      this.isCertificationActive() &&
      !this.isCertificationStaged()
    );
  }

  /**
   * Handle sign-off action
   */
  async signOffCertification(): Promise<void> {
    if (!this.certificationDetails?.certification?.id) {
      console.error('No certification ID available for sign-off');
      return;
    }

    // Show confirmation dialog
    const confirmed = confirm(
      'Are you sure you want to sign off this certification? This action will complete the review process and cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    this.loading = true;
    try {
      // Call the sign-off API
      const response = await this.sdk.signOffIdentityCertification({
        id: this.certificationDetails.certification.id,
      });

      console.log('Certification signed off successfully:', response);

      // Reload certification details to get updated status
      await this.loadCertificationDetails();
    } catch (error) {
      console.error('Error signing off certification:', error);
      this.error = `Failed to sign off certification: ${String(error)}`;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Download access review items as CSV
   */
  downloadAccessReviewItemsCSV(): void {
    if (
      !this.certificationDetails?.accessReviewItems ||
      this.certificationDetails.accessReviewItems.length === 0
    ) {
      console.warn('No access review items to download');
      return;
    }

    try {
      // Get columns excluding Actions column
      const exportColumns = this.accessReviewColumns.filter(
        (column) => column.name !== 'Actions'
      );

      // Create CSV headers with ID as first column
      const headers = [
        'ID',
        ...exportColumns.map((column) => this.escapeCSVField(column.name)),
      ];
      const csvContent = [headers.join(',')];

      // Add data rows
      this.certificationDetails.accessReviewItems.forEach((item) => {
        const row = [
          // First column: Item ID
          this.escapeCSVField(item.id || ''),
          // Rest of the columns
          ...exportColumns.map((column) => {
            let value = '';

            if (column.dataAccessor) {
              const rawValue = column.dataAccessor(item);

              // Handle special cases for decision column
              if (column.name === 'Decision') {
                value = this.getCurrentDecision(item.id) || 'PENDING';
              } else if (column.formatter) {
                value = column.formatter(rawValue);
              } else {
                value = rawValue || '';
              }
            }

            return this.escapeCSVField(String(value));
          }),
        ];

        csvContent.push(row.join(','));
      });

      // Create and download the file
      const csvString = csvContent.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Generate filename with certification ID and timestamp
        const certificationId =
          this.certificationDetails.certification.id || 'certification';
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        link.setAttribute(
          'download',
          `access-review-items-${certificationId}-${timestamp}.csv`
        );

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('CSV download initiated successfully');
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      this.error = `Failed to download CSV: ${String(error)}`;
    }
  }

  /**
   * Escape CSV field to handle special characters and commas
   */
  private escapeCSVField(field: string): string {
    if (!field) return '';

    // If field contains comma, newline, or double quote, wrap in quotes and escape internal quotes
    if (
      field.includes(',') ||
      field.includes('\n') ||
      field.includes('\r') ||
      field.includes('"')
    ) {
      return '"' + field.replace(/"/g, '""') + '"';
    }

    return field;
  }

  /**
   * Check if Load CSV button should be shown
   */
  shouldShowLoadCSVButton(): boolean {
    return (
      !this.certificationDetails?.certification?.completed &&
      this.isCertificationActive() &&
      !this.isCertificationStaged()
    );
  }

  /**
   * Get tooltip text for Load CSV button
   */
  getLoadCSVTooltip(): string {
    if (this.certificationDetails?.certification?.completed) {
      return 'Load CSV is not available for completed certifications';
    }
    if (!this.isCertificationActive()) {
      return 'Load CSV is only available for active certifications';
    }
    if (this.isCertificationStaged()) {
      return 'Load CSV is not available for staged certifications';
    }
    return 'Upload CSV file to update decisions for access review items';
  }

  /**
   * Load CSV file using nz-upload component
   */
  loadCSV = (file: File): boolean => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error = 'Please select a valid CSV file';
      return false;
    }

    // Read and process the CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      this.processCSVContent(csvContent);
    };
    reader.onerror = () => {
      this.error = 'Error reading CSV file';
    };
    reader.readAsText(file);

    // Return false to prevent automatic upload
    return false;
  };

  /**
   * Process CSV content and update decisions
   */
  private processCSVContent(csvContent: string): void {
    try {
      const lines = csvContent.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        this.error =
          'CSV file must contain at least a header row and one data row';
        return;
      }

      // Parse header row to find column indices
      const headers = this.parseCSVLine(lines[0]);
      const idIndex = headers.findIndex(
        (header) => header.toLowerCase() === 'id'
      );
      const decisionIndex = headers.findIndex(
        (header) => header.toLowerCase() === 'decision'
      );

      if (idIndex === -1) {
        this.error = 'CSV file must contain an "ID" column';
        return;
      }

      if (decisionIndex === -1) {
        this.error = 'CSV file must contain a "Decision" column';
        return;
      }

      // Process data rows
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCSVLine(lines[i]);

        if (row.length <= Math.max(idIndex, decisionIndex)) {
          errors.push(`Row ${i + 1}: Insufficient columns`);
          continue;
        }

        const itemId = row[idIndex]?.trim();
        const decision = row[decisionIndex]?.trim().toUpperCase();

        if (!itemId) {
          errors.push(`Row ${i + 1}: Missing item ID`);
          continue;
        }

        // Validate decision value
        if (!['APPROVE', 'REVOKE', 'PENDING'].includes(decision)) {
          errors.push(
            `Row ${
              i + 1
            }: Invalid decision "${decision}". Must be APPROVE, REVOKE, or PENDING`
          );
          continue;
        }

        // Find the corresponding access review item
        const item = this.certificationDetails?.accessReviewItems.find(
          (accessItem) => accessItem.id === itemId
        );

        if (!item) {
          errors.push(`Row ${i + 1}: Item with ID "${itemId}" not found`);
          continue;
        }

        // Only update if item is not completed
        if (item.completed) {
          skippedCount++;
          continue;
        }

        // Update decision changes
        if (decision === 'PENDING') {
          // Remove from changes map if it exists (reverting to default state)
          this.decisionChanges.delete(itemId);
        } else {
          // Store the change for APPROVE/REVOKE decisions
          this.decisionChanges.set(itemId, decision);
        }

        // Also update the item in the data for immediate UI feedback
        item.decision = decision;
        updatedCount++;
      }

      // Show results
      let message = `CSV processing completed. Updated ${updatedCount} items`;
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} completed items`;
      }
      if (errors.length > 0) {
        message += `, ${errors.length} errors encountered`;
        console.warn('CSV processing errors:', errors);
      }

      console.log(message);

      // Clear any previous errors if processing was successful
      if (errors.length === 0) {
        this.error = null;
      } else {
        this.error = `CSV processing completed with ${errors.length} errors. Check console for details.`;
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      this.error = `Failed to process CSV file: ${String(error)}`;
    }
  }

  /**
   * Parse a CSV line, handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  }
}
