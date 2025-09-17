import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SailPointSDKService } from '../sailpoint-sdk.service';
import { IdentityCertificationDtoV2025 } from 'sailpoint-api-client';
import { GenericDialogComponent } from '../generic-dialog/generic-dialog.component';
import {
  JokeDialogComponent,
  JokeData,
} from './joke-dialog/joke-dialog.component';
import { ConnectionService } from 'src/app/services/connection.service';
import { ElectronApiFactoryService } from '../services/electron-api-factory.service';
import z from 'zod/v4';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import {
  NzTableFilterFn,
  NzTableModule,
  NzTableSortFn,
  NzTableSortOrder,
} from 'ng-zorro-antd/table';
import { NzIconModule, provideNzIconsPatch } from 'ng-zorro-antd/icon';
import {
  HomeOutline,
  UserOutline,
  SettingOutline,
  FormOutline,
  KeyOutline,
  TeamOutline,
  FileTextOutline,
  ArrowLeftOutline,
  ExclamationCircleOutline,
  QuestionCircleOutline,
  LockOutline,
  CheckSquareOutline,
  DownloadOutline,
  SmileOutline,
  GiftOutline,
  ReloadOutline,
  BellOutline,
  MessageOutline,
  DashboardOutline,
} from '@ant-design/icons-angular/icons';
import { NavigationItem, NavigationStackService } from './navigation-stack';
import { NZ_I18N, NzI18nService, en_US } from 'ng-zorro-antd/i18n';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CertificationDetailComponent } from './certification-detail/certification-detail.component';
import { IdentityInfoComponent } from './identity-info/identity-info.component';
import { AccessDetailComponent } from './access-detail/access-detail.component';

// Interface for column configuration with sort and filter
interface ColumnItem {
  name: string;
  sortOrder: NzTableSortOrder | null;
  sortFn: NzTableSortFn<IdentityCertificationDtoV2025> | null;
  sortDirections: NzTableSortOrder[];
  filterMultiple: boolean;
  listOfFilter: Array<{ text: string; value: string; byDefault?: boolean }>;
  filterFn: NzTableFilterFn<IdentityCertificationDtoV2025> | null;
  // New properties for dynamic data access and display
  dataAccessor?: (item: IdentityCertificationDtoV2025) => any;
  formatter?: (value: any) => string;
  cssClass?: (value: any) => string;
}

// Interface for campaign summary data
interface CampaignSummary {
  campaignName: string;
  campaignType: string;
  campaignDescription: string;
  totalCertifications: number;
  completedCertifications: number;
  incompleteCertifications: number;
  totalIdentities: number;
  completedIdentities: number;
  totalDecisions: number;
  madeDecisions: number;
  phaseCounts: {
    staged: number;
    active: number;
    signed: number;
  };
}

@Component({
  selector: 'app-certification-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
    MatDialogModule,
    NzBreadCrumbModule,
    NzIconModule,
    NzButtonModule,
    NzTableModule,
    NzDropDownModule,
    NzInputModule,
    NzCheckboxModule,
    NzDividerModule,
    NzToolTipModule,
    NzStatisticModule,
    NzCarouselModule,
    NzTagModule,
    CertificationDetailComponent,
    IdentityInfoComponent,
    AccessDetailComponent,
  ],
  providers: [
    provideNzIconsPatch([
      HomeOutline,
      UserOutline,
      SettingOutline,
      FormOutline,
      KeyOutline,
      TeamOutline,
      FileTextOutline,
      ArrowLeftOutline,
      ExclamationCircleOutline,
      QuestionCircleOutline,
      LockOutline,
      CheckSquareOutline,
      DownloadOutline,
      SmileOutline,
      GiftOutline,
      ReloadOutline,
      BellOutline,
      MessageOutline,
      DashboardOutline,
    ]),
    { provide: NZ_I18N, useValue: en_US },
  ],
  templateUrl: './certification-management.component.html',
  styleUrl: './certification-management.component.scss',
})
export class CertificationManagementComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  title = 'Certification Management';
  certifications: IdentityCertificationDtoV2025[] = []; // Original data from API
  filteredCertifications: IdentityCertificationDtoV2025[] = []; // Filtered data for display
  loading = false;
  jokeLoading = false;
  openAIApiKey: string | null = null;
  displayedColumns: string[] = [
    'name',
    'campaignName',
    'campaignType',
    'isCompleted',
    'viewAction',
  ];

  // Navigation stack properties
  navigationStack: NavigationItem[] = [];
  currentLevel = 0;

  // Certification name search properties
  nameSearchValue = '';
  visible = false;

  // Column visibility management
  visibleColumns: Set<string> = new Set();
  columnDropdownVisible = false;

  // Joke button properties
  isJokeButtonEnabled = false;
  jokeButtonIcon = 'smile';
  totalSavedDecisions = 0;

  // Campaign summary properties
  campaignSummaries: CampaignSummary[] = [];

  // Table sort and filter configuration
  listOfColumns: ColumnItem[] = [
    {
      name: 'Name',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.name,
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Campaign Name',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: IdentityCertificationDtoV2025) =>
        list.some(
          (name) =>
            (item.campaign?.name || '')
              .toLowerCase()
              .indexOf(name.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => item.campaign?.name,
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Campaign Type',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: IdentityCertificationDtoV2025) =>
        list.some(
          (type) =>
            (item.campaign?.type || '')
              .toLowerCase()
              .indexOf(type.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => item.campaign?.type,
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Campaign Description',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.campaign?.description,
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
      filterFn: (list: string[], item: IdentityCertificationDtoV2025) => {
        if (!list || list.length === 0) return true;
        const itemStatus = item.completed ? 'Yes' : 'No';
        return list.includes(itemStatus);
      },
      dataAccessor: (item) => item.completed,
      formatter: (value) => (value ? 'Yes' : 'No'),
      cssClass: (value) => (value ? 'status-completed' : 'status-pending'),
    },
    {
      name: 'Identities Completed',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) => (a.identitiesCompleted || 0) - (b.identitiesCompleted || 0),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.identitiesCompleted,
      formatter: (value) => (value || 0).toString(),
    },
    {
      name: 'Identities Total',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) => (a.identitiesTotal || 0) - (b.identitiesTotal || 0),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.identitiesTotal,
      formatter: (value) => (value || 0).toString(),
    },
    {
      name: 'Created',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) =>
        new Date(a.created || '').getTime() -
        new Date(b.created || '').getTime(),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.created,
      formatter: (value) => (value ? new Date(value).toLocaleString() : 'N/A'),
    },
    {
      name: 'Decisions Made',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) => (a.decisionsMade || 0) - (b.decisionsMade || 0),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.decisionsMade,
      formatter: (value) => (value || 0).toString(),
    },
    {
      name: 'Decisions Total',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) => (a.decisionsTotal || 0) - (b.decisionsTotal || 0),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.decisionsTotal,
      formatter: (value) => (value || 0).toString(),
    },
    {
      name: 'Due',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) => new Date(a.due || '').getTime() - new Date(b.due || '').getTime(),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.due,
      formatter: (value) => (value ? new Date(value).toLocaleString() : 'N/A'),
    },
    {
      name: 'Signed',
      sortOrder: null,
      sortFn: (
        a: IdentityCertificationDtoV2025,
        b: IdentityCertificationDtoV2025
      ) =>
        new Date(a.signed || '').getTime() - new Date(b.signed || '').getTime(),
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: null,
      dataAccessor: (item) => item.signed,
      formatter: (value) => (value ? new Date(value).toLocaleString() : 'N/A'),
    },
    {
      name: 'Reviewer Name',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: IdentityCertificationDtoV2025) =>
        list.some(
          (name) =>
            (item.reviewer?.name || '')
              .toLowerCase()
              .indexOf(name.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => item.reviewer?.name,
      formatter: (value) => value || 'N/A',
    },
    {
      name: 'Phase',
      sortOrder: null,
      sortFn: null,
      sortDirections: ['ascend', 'descend'],
      filterMultiple: true,
      listOfFilter: [],
      filterFn: (list: string[], item: IdentityCertificationDtoV2025) =>
        list.some(
          (phase) =>
            (item.phase || '').toLowerCase().indexOf(phase.toLowerCase()) !== -1
        ),
      dataAccessor: (item) => item.phase,
      formatter: (value) => value || 'N/A',
    },
  ];

  constructor(
    private sdk: SailPointSDKService,
    private dialog: MatDialog,
    private electronService: ElectronApiFactoryService,
    private connectionService: ConnectionService,
    private navStack: NavigationStackService,
    private i18n: NzI18nService
  ) {
    // Subscribe to stack state changes
    this.navStack.getStackState().subscribe((state) => {
      this.navigationStack = state.items;
      this.currentLevel = state.currentLevel;
    });
  }

  ngOnInit() {
    this.i18n.setLocale(en_US);
    // Monitor environment changes and load OpenAI API Key
    this.subscriptions.add(
      this.connectionService.currentEnvironment$.subscribe(async (env) => {
        if (env?.name) {
          await this.loadOpenAIApiKey(env.name);
        }
      })
    );

    // Initialize with root level
    this.initializeRootLevel();

    // Initialize column visibility - show all columns by default
    this.initializeColumnVisibility();

    // load certifications
    void this.getCertificationManagement();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private initializeRootLevel(): void {
    const rootItem: NavigationItem = {
      id: 'certifications',
      title: 'Certification Management',
      component: 'certification-list',
      breadcrumb: {
        label: 'Certifications',
        icon: 'home',
      },
    };
    this.navStack.initialize(rootItem);
  }

  /**
   * Reset the name search filter and show all certifications
   */
  nameSearchReset(): void {
    this.nameSearchValue = '';
    this.nameSearchSubmit();
  }

  /**
   * Apply name search filter to the certifications list
   * Filters the original data without modifying it
   */
  nameSearchSubmit(): void {
    this.visible = false;

    // If search value is empty, show all certifications
    if (!this.nameSearchValue.trim()) {
      this.filteredCertifications = [...this.certifications];
    } else {
      // Filter certifications by name (case-insensitive)
      this.filteredCertifications = this.certifications.filter(
        (item: IdentityCertificationDtoV2025) =>
          item.name
            ?.toLowerCase()
            .indexOf(this.nameSearchValue.toLowerCase()) !== -1
      );
    }
  }

  onBreadcrumbClick(level: number): void {
    console.log('Breadcrumb clicked, navigating to level:', level);
    this.navStack.navigateToLevel(level);
  }

  // Method to navigate to certification details
  navigateToDetail(certification: IdentityCertificationDtoV2025): void {
    const certificationName = certification.name || 'Unknown Certification';
    const detailItem: NavigationItem = {
      id: `certification-${certification.id}`,
      title: `Certification Details`,
      component: 'certification-detail',
      data: { certificationId: certification.id },
      breadcrumb: {
        label: `Details: ${certificationName}`,
        icon: 'form',
      },
    };
    this.navStack.push(detailItem);
  }

  // Get current component type for ngSwitch
  getCurrentComponent(): string {
    const currentItem = this.navStack.peek();
    return currentItem?.component || 'certification-list';
  }

  // Get current title for display
  getCurrentTitle(): string {
    const currentItem = this.navStack.peek();
    return currentItem?.title || 'Certification Management';
  }

  // Get current breadcrumb label for display
  getCurrentBreadcrumbLabel(): string {
    const currentItem = this.navStack.peek();
    return currentItem?.breadcrumb?.label || 'Certification Management';
  }

  // Get current data for the active level
  getCurrentData(): any {
    const currentItem = this.navStack.peek();
    return currentItem?.data || null;
  }

  // Go back to previous level
  goBack(): void {
    this.navStack.pop();
  }

  async generateJoke(): Promise<JokeData | null> {
    if (!this.openAIApiKey) {
      console.error('OpenAI API Key not available');
      return null;
    }
    try {
      const openai = createOpenAI({
        apiKey: this.openAIApiKey,
      });
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          joke: z.string(),
          punchline: z.string(),
        }),
        prompt:
          'Please generate a joke and punchline about the identity governance related to certifications and access reviews.',
      });
      console.log('Generated joke:', object);
      return object as JokeData;
    } catch (error) {
      console.error('Error generating joke:', error);
      return null;
    }
  }

  async loadOpenAIApiKey(environmentName: string) {
    try {
      const tenants = await this.electronService.getApi().getTenants();
      const tenant = tenants.find((t) => t.name === environmentName);
      this.openAIApiKey = tenant?.openAIApiKey || null;
      console.log(
        'OpenAI API Key loaded for certification management:',
        this.openAIApiKey ? 'Available' : 'Not set'
      );
    } catch (error) {
      console.error('Error loading OpenAI API Key:', error);
    }
    console.log('OpenAI API Key:', this.openAIApiKey);
  }

  /**
   * Load certification data from the API
   * Sets both original and filtered data arrays
   */
  async getCertificationManagement() {
    this.loading = true;
    try {
      const res = await this.sdk.listIdentityCertifications();
      if (res.status === 200) {
        // Store original data from API
        this.certifications = res.data || [];
        // Initialize filtered data with all certifications
        this.filteredCertifications = [...this.certifications];
        // console.log('Certifications set to:', this.certifications);
        // Generate campaign summaries
        this.generateCampaignSummaries();
        // Populate filter options after loading data
        this.populateFilterOptions();
      } else {
        console.error('Error loading certifications:', res.statusText);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Refresh the certification data by reloading from the API
   */
  async refreshCertifications(): Promise<void> {
    await this.getCertificationManagement();
  }

  // View certification details in dialog (legacy method - now using navigation)
  async onView(certification: IdentityCertificationDtoV2025): Promise<void> {
    try {
      if (!certification.id) {
        this.openMessageDialog('Certification ID is missing.', 'Error');
        return;
      }

      // Navigate to detail view instead of showing dialog
      this.navigateToDetail(certification);
    } catch (error) {
      this.openMessageDialog(
        `Failed to load certification details: ${String(error)}`,
        'Error'
      );
    }
  }

  // Show dialog with title + message
  openMessageDialog(message: string, title: string): void {
    this.dialog.open(GenericDialogComponent, {
      minWidth: '800px',
      data: {
        title: title,
        message: message,
      },
    });
  }

  // Show joke dialog
  async showJokeDialog(): Promise<void> {
    // Only allow if button is enabled
    if (!this.isJokeButtonEnabled) {
      return;
    }

    // Set loading state
    this.jokeLoading = true;

    try {
      // Generate joke using AI
      const generatedJoke = await this.generateJoke();

      // Use generated joke or fallback to default
      const jokeData: JokeData = generatedJoke || {
        joke: 'Why did the identity governance officer break up with their partner?',
        punchline:
          "Too many access reviews; they just couldn't handle the commitment!",
      };

      // Open dialog with the joke
      this.dialog.open(JokeDialogComponent, {
        width: '500px',
        data: jokeData,
      });

      // Reset button to initial state after showing joke
      this.resetJokeButton();
    } catch (error) {
      console.error('Error in showJokeDialog:', error);

      // Show fallback joke even if generation fails
      const fallbackJoke: JokeData = {
        joke: 'Why did the identity governance officer break up with their partner?',
        punchline:
          "Too many access reviews; they just couldn't handle the commitment!",
      };

      this.dialog.open(JokeDialogComponent, {
        width: '500px',
        data: fallbackJoke,
      });

      // Reset button to initial state after showing joke
      this.resetJokeButton();
    } finally {
      // Always clear loading state
      this.jokeLoading = false;
    }
  }

  /**
   * Get tooltip text for joke button
   */
  getJokeButtonTooltip(): string {
    if (this.jokeLoading) {
      return 'Generating your surprise... ⏳';
    } else if (this.isJokeButtonEnabled) {
      return 'Click for a surprise! 🎁';
    } else {
      const remaining = 10 - this.totalSavedDecisions;
      return `Complete ${remaining} more decisions to unlock the joke! (${this.totalSavedDecisions}/10)`;
    }
  }

  /**
   * Update decision count and check if joke button should be enabled
   */
  updateDecisionCount(savedCount: number): void {
    this.totalSavedDecisions += savedCount;

    if (this.totalSavedDecisions >= 10 && !this.isJokeButtonEnabled) {
      this.isJokeButtonEnabled = true;
      this.jokeButtonIcon = 'gift';
    }
  }

  /**
   * Reset joke button to initial state
   */
  resetJokeButton(): void {
    this.isJokeButtonEnabled = false;
    this.jokeButtonIcon = 'smile';
    this.totalSavedDecisions = 0;
  }

  // Track by function for ngFor
  trackByCertificationId(
    index: number,
    certification: IdentityCertificationDtoV2025
  ): string {
    return certification.id || index.toString();
  }

  /**
   * Populate filter options dynamically based on the original certification data
   * This ensures filter options are always based on the complete dataset
   */
  private populateFilterOptions(): void {
    this.listOfColumns.forEach((column) => {
      // Skip columns that don't have dataAccessor or already have predefined filters
      if (!column.dataAccessor || column.listOfFilter.length > 0) {
        return;
      }

      // Get unique values for this column from the original data (not filtered)
      const values = [
        ...new Set(
          this.certifications
            .map((certification) => {
              const value = column.dataAccessor!(certification);
              // Convert to string for filtering, handle different data types
              if (value === null || value === undefined) return null;
              if (typeof value === 'object' && value instanceof Date) {
                return value.toISOString();
              }
              return value.toString();
            })
            .filter(Boolean)
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
   * Initialize column visibility - show all columns by default
   */
  private initializeColumnVisibility(): void {
    this.visibleColumns.clear();
    this.listOfColumns.forEach((column) => {
      this.visibleColumns.add(column.name);
    });
  }

  /**
   * Toggle column visibility
   */
  toggleColumnVisibility(columnName: string): void {
    if (this.visibleColumns.has(columnName)) {
      this.visibleColumns.delete(columnName);
    } else {
      this.visibleColumns.add(columnName);
    }
  }

  /**
   * Check if a column is visible
   */
  isColumnVisible(columnName: string): boolean {
    return this.visibleColumns.has(columnName);
  }

  /**
   * Get filtered list of columns based on visibility
   */
  getVisibleColumns(): ColumnItem[] {
    return this.listOfColumns.filter((column) =>
      this.visibleColumns.has(column.name)
    );
  }

  /**
   * Select all columns
   */
  selectAllColumns(): void {
    this.initializeColumnVisibility();
  }

  /**
   * Deselect all columns
   */
  deselectAllColumns(): void {
    this.visibleColumns.clear();
  }

  /**
   * Generate campaign summaries from certification data
   */
  generateCampaignSummaries(): void {
    const campaignMap = new Map<string, CampaignSummary>();

    this.certifications.forEach((certification) => {
      const campaignName = certification.campaign?.name || 'Unknown Campaign';
      const campaignType = certification.campaign?.type || 'Unknown Type';
      const campaignDescription = certification.campaign?.description || '';

      if (!campaignMap.has(campaignName)) {
        campaignMap.set(campaignName, {
          campaignName,
          campaignType,
          campaignDescription,
          totalCertifications: 0,
          completedCertifications: 0,
          incompleteCertifications: 0,
          totalIdentities: 0,
          completedIdentities: 0,
          totalDecisions: 0,
          madeDecisions: 0,
          phaseCounts: {
            staged: 0,
            active: 0,
            signed: 0,
          },
        });
      }

      const summary = campaignMap.get(campaignName)!;

      // Count certifications
      summary.totalCertifications++;
      if (certification.completed) {
        summary.completedCertifications++;
      } else {
        summary.incompleteCertifications++;
      }

      // Aggregate identities
      summary.totalIdentities += certification.identitiesTotal || 0;
      summary.completedIdentities += certification.identitiesCompleted || 0;

      // Aggregate decisions
      summary.totalDecisions += certification.decisionsTotal || 0;
      summary.madeDecisions += certification.decisionsMade || 0;

      // Count phases
      const phase = certification.phase?.toLowerCase() || '';
      if (phase.includes('staged')) {
        summary.phaseCounts.staged++;
      } else if (phase.includes('active')) {
        summary.phaseCounts.active++;
      } else if (phase.includes('signed')) {
        summary.phaseCounts.signed++;
      }
    });

    this.campaignSummaries = Array.from(campaignMap.values());
  }

  /**
   * Get color for campaign type tag
   */
  getCampaignTypeColor(campaignType: string): string {
    const typeColors: { [key: string]: string } = {
      'Access Review': 'blue',
      'Identity Review': 'green',
      'Entitlement Review': 'orange',
      'Role Review': 'purple',
      Default: 'default',
    };
    return typeColors[campaignType] || typeColors['Default'];
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }
}
