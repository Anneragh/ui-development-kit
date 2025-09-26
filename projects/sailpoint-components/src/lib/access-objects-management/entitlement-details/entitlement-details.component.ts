import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-entitlement-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, DragDropModule, MatTabsModule, MatSelectModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatChipsModule, MatAutocompleteModule, MatCheckboxModule],
  templateUrl: './entitlement-details.component.html',
  styleUrls: ['./entitlement-details.component.scss']
})
export class EntitlementDetailsComponent implements OnInit {
  /**
   * Handles drag-and-drop of members out of a governance group (removal).
   * @param event Angular CDK drop event
   * @param groupId The governance group ID
   */
  async onMemberRemoveDrop(event: any, groupId: string) {
    if (event.previousContainer !== event.container) {
      const member = event.previousContainer.data[event.previousIndex];
      // Remove member from group via API
      await this.removeMemberFromGroup(groupId, member.id);
      // Optionally add back to availableIdentities
      this.availableIdentities.push(member);
    }
    await this.refreshGroupMembers(groupId);
  }
  entitlement: any = null;
  entitlementRequestConfig: any = null;
  activeTab: 'details' | 'approval' = 'details';
  activeStep: number = 0;
  editingDescription: boolean = false;
  descriptionValue: string = '';
  governanceGroupMembers: { [groupId: string]: any[] } = {};
  memberSearch: string = '';
  memberSearchResults: any[] = [];
  selectedGroupId: string | null = null;

  // Identities available to add to workgroup (for drag-and-drop)
  availableIdentities: any[] = [];

  // Editable approval schemes (working copy)
  editableApprovalSchemes: any[] = []; // legacy (details tab)
  accessApprovalSchemes: any[] = [];
  revocationApprovalSchemes: any[] = [];
  savingApproval: boolean = false;
  approvalError: string | null = null;
  // Request config editing
  requestableValue: boolean = false;
  savingRequestConfig: boolean = false;
  requestConfigError: string | null = null;
  accessRequestConfigValues: any = { requestCommentRequired: true, denialCommentRequired: true, reauthorizationRequired: false };
  revocationRequestConfigValues: any = { requestCommentRequired: true, denialCommentRequired: true, reauthorizationRequired: false };
  savingFlowConfigs: boolean = false;
  flowConfigError: string | null = null;
  // Entitlement members tab
  entitlementMembers: any[] = [];
  loadingMembers: boolean = false;
  membersError: string | null = null;
  membersSearch: string = '';
  membersPage: number = 0;
  membersPageSize: number = 50;
  membersTotal: number = 0;
  // Request history
  requestHistory: any[] = [];
  loadingHistory: boolean = false;
  historyError: string | null = null;
  historyPage: number = 0;
  historyPageSize: number = 25;
  historyTotal: number = 0;
  historySearch: string = '';

  approverTypes = [
    { value: 'MANAGER', label: 'Manager' },
    { value: 'OWNER', label: 'Owner' },
    { value: 'GOVERNANCE_GROUP', label: 'Governance Group' }
  ];

  // Workgroup search
  workgroupSearchControl: FormControl = new FormControl('');
  filteredWorkgroups: any[] = [];
  private workgroupSearchTimeout: any;

  onWorkgroupSearchChange(step: any) {
    const term = (this.workgroupSearchControl.value || '').trim();
    clearTimeout(this.workgroupSearchTimeout);
    this.workgroupSearchTimeout = setTimeout(async () => {
      if (!term) {
        this.filteredWorkgroups = [];
        return;
      }
      try {
        const res = await this.sdk.listWorkgroups({ name: term } as any);
        this.filteredWorkgroups = res.data || [];
      } catch (e) {
        console.error('Workgroup search failed', e);
        this.filteredWorkgroups = [];
      }
    }, 300);
  }

  async selectWorkgroup(step: any, wg: any) {
    step.approverId = wg.id;
  step.selectedWorkgroup = wg;
    this.workgroupSearchControl.setValue(wg.displayName || wg.name || wg.id);
    this.filteredWorkgroups = [];
    await this.refreshGroupMembers(wg.id);
  }

  // Per-step pending identity helpers
  addPendingIdentityFromInput(step: any) {
    const v = (step.identityInputValue || '').trim();
    if (v && !step.pendingIdentities.includes(v)) {
      step.pendingIdentities.push(v);
    }
    step.identityInputValue = '';
  }

  removePendingIdentity(step: any, index: number) {
    step.pendingIdentities.splice(index, 1);
  }

  async addAllPendingToGroup(step: any) {
    const groupId = step.approverId;
    if (!groupId || !step.pendingIdentities.length) return;
    const members = step.pendingIdentities.map((id: string) => ({ type: 'IDENTITY', id }));
    await this.sdk.updateWorkgroupMembers({ workgroupId: groupId, members } as any);
    step.pendingIdentities = [];
    await this.refreshGroupMembers(groupId);
  }

  private identitySearchTimeout: any;
  async onIdentitySearchChange(step: any) {
    const term = (step.identityInputValue || '').trim();
    clearTimeout(this.identitySearchTimeout);
    if (!term) {
      step.identitySuggestions = [];
      return;
    }
    this.identitySearchTimeout = setTimeout(async () => {
      try {
        // Re-using workgroup members lookup as placeholder (replace with real identity search API if available)
        const res = await this.sdk.searchPost({
          searchV2025: {
            indices: ['identities'],
            query: { query: `name:*${term}* OR displayName:*${term}*` },
            sort: ["+name"],
            size: 10
          }
        } as any);
        step.identitySuggestions = (res.data || []).map((r: any) => ({ id: r.id, displayName: r.displayName || r.name || r.id }));
      } catch (e) {
        console.error('Identity search failed', e);
        step.identitySuggestions = [];
      }
    }, 300);
  }

  addIdentitySuggestion(step: any, suggestion: any) {
    if (!step.pendingIdentities.includes(suggestion.id)) {
      step.pendingIdentities.push(suggestion.id);
    }
    step.identityInputValue = '';
    step.identitySuggestions = [];
  }

  addApprovalStep() {
    this.editableApprovalSchemes.push({
      approverType: 'MANAGER',
      approverId: null,
      pendingIdentities: [],
      identityInputValue: ''
    });
  }

  removeApprovalStep(index: number) {
    this.editableApprovalSchemes.splice(index, 1);
  }

  dropApprovalStep(event: CdkDragDrop<any[]>) {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.editableApprovalSchemes, event.previousIndex, event.currentIndex);
    }
  }

  async saveApprovalConfig() {
    if (!this.entitlement?.id) return;
    this.savingApproval = true;
    this.approvalError = null;
    try {
      const payload = {
        id: this.entitlement.id,
        accessRequestConfig: {
          approvalSchemes: this.editableApprovalSchemes.map((s, i) => ({
            approverType: s.approverType,
            approverId: s.approverType === 'GOVERNANCE_GROUP' ? s.approverId : undefined
          }))
        }
      } as any;
      // NOTE: Replace with actual SDK call when available (e.g., updateEntitlementRequestConfig)
      console.log('Saving approval config payload', payload);
      // Placeholder success simulation
      this.entitlementRequestConfig = payload;
    } catch (e: any) {
      console.error('Failed to save approval config', e);
      this.approvalError = e?.message || 'Failed to save';
    } finally {
      this.savingApproval = false;
    }
  }

  constructor(private route: ActivatedRoute, private sdk: SailPointSDKService) {}

  startEditDescription() {
    this.editingDescription = true;
    this.descriptionValue = this.entitlement?.description || '';
  }

  async updateDescription() {
    if (!this.entitlement?.id) return;
    try {
      // Use JSON Patch format for updating description
      await this.sdk.patchEntitlement({
        id: this.entitlement.id,
        jsonPatchOperationV2025: [
          { op: 'replace', path: '/description', value: this.descriptionValue }
        ]
      });
      this.editingDescription = false;
      // Refresh entitlement data
      const res = await this.sdk.getEntitlement({ id: this.entitlement.id });
      this.entitlement = res.data;
    } catch (e) {
      console.error('Failed to update description:', e);
    }
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const res = await this.sdk.getEntitlement({ id });
      this.entitlement = res.data;
  this.requestableValue = !!this.entitlement?.requestable;
      try {
        const configRes = await this.sdk.getEntitlementRequestConfig({ id });
        console.log('Fetched entitlement-request-config:', configRes.data);
        this.entitlementRequestConfig = configRes.data;
  // Initialize editable approval schemes from fetched config (details tab retains access approval schemes for visual parity)
  this.accessApprovalSchemes = [...(this.entitlementRequestConfig?.accessRequestConfig?.approvalSchemes || [])].map((s: any) => ({ ...s, pendingIdentities: [], identityInputValue: '', selectedWorkgroup: null }));
  this.revocationApprovalSchemes = [...(this.entitlementRequestConfig?.revocationRequestConfig?.approvalSchemes || [])].map((s: any) => ({ ...s, pendingIdentities: [], identityInputValue: '', selectedWorkgroup: null }));
  this.editableApprovalSchemes = this.accessApprovalSchemes; // keep original reference for existing UI section
        // Initialize config value states if present
        if (this.entitlementRequestConfig?.accessRequestConfig) {
          this.accessRequestConfigValues = {
            requestCommentRequired: !!this.entitlementRequestConfig.accessRequestConfig.requestCommentRequired,
            denialCommentRequired: !!this.entitlementRequestConfig.accessRequestConfig.denialCommentRequired,
            reauthorizationRequired: !!this.entitlementRequestConfig.accessRequestConfig.reauthorizationRequired
          };
        }
        if (this.entitlementRequestConfig?.revocationRequestConfig) {
          this.revocationRequestConfigValues = {
            requestCommentRequired: !!this.entitlementRequestConfig.revocationRequestConfig.requestCommentRequired,
            denialCommentRequired: !!this.entitlementRequestConfig.revocationRequestConfig.denialCommentRequired,
            reauthorizationRequired: !!this.entitlementRequestConfig.revocationRequestConfig.reauthorizationRequired
          };
        }
        // For any governance group steps, attempt to populate selectedWorkgroup with minimal object so name/ID shows
  for (const step of [...this.accessApprovalSchemes, ...this.revocationApprovalSchemes]) {
          if (step.approverType === 'GOVERNANCE_GROUP' && step.approverId && !step.selectedWorkgroup) {
            try {
              // If SDK has a workgroup get endpoint, use it; else fallback to ID only object
              if ((this.sdk as any).getWorkgroup) {
                const wgRes = await (this.sdk as any).getWorkgroup({ id: step.approverId });
                step.selectedWorkgroup = wgRes.data || { id: step.approverId };
              } else {
                step.selectedWorkgroup = { id: step.approverId };
              }
            } catch (e) {
              step.selectedWorkgroup = { id: step.approverId };
            }
          }
        }
        // Fetch governance group members for all approval schemes
        this.fetchAllGovernanceGroupMembers();
      } catch (e) {
        console.error('Failed to fetch entitlement-request-config:', e);
      }
    }
  }

  async saveRequestConfig() {
    if (!this.entitlement?.id) return;
    this.savingRequestConfig = true;
    this.requestConfigError = null;
    try {
      await this.sdk.patchEntitlement({
        id: this.entitlement.id,
        jsonPatchOperationV2025: [
          { op: 'replace', path: '/requestable', value: this.requestableValue }
        ]
      });
      // Refresh entitlement
      const res = await this.sdk.getEntitlement({ id: this.entitlement.id });
      this.entitlement = res.data;
    } catch (e: any) {
      console.error('Failed to save request config', e);
      this.requestConfigError = e?.message || 'Failed to save';
    } finally {
      this.savingRequestConfig = false;
    }
  }

  async saveFlowConfigs() {
    if (!this.entitlement?.id) return;
    this.savingFlowConfigs = true;
    this.flowConfigError = null;
    try {
      // Placeholder: If backend supports separate patch for request config, call it; else include in entitlement patch if spec allows.
      // We'll just update local entitlementRequestConfig for now.
      if (!this.entitlementRequestConfig) {
        this.entitlementRequestConfig = {} as any;
      }
      this.entitlementRequestConfig.accessRequestConfig = {
        ...(this.entitlementRequestConfig.accessRequestConfig || {}),
        requestCommentRequired: this.accessRequestConfigValues.requestCommentRequired,
        denialCommentRequired: this.accessRequestConfigValues.denialCommentRequired,
        reauthorizationRequired: this.accessRequestConfigValues.reauthorizationRequired,
        approvalSchemes: this.accessApprovalSchemes
      };
      this.entitlementRequestConfig.revocationRequestConfig = {
        ...(this.entitlementRequestConfig.revocationRequestConfig || {}),
        requestCommentRequired: this.revocationRequestConfigValues.requestCommentRequired,
        denialCommentRequired: this.revocationRequestConfigValues.denialCommentRequired,
        reauthorizationRequired: this.revocationRequestConfigValues.reauthorizationRequired,
        approvalSchemes: this.revocationApprovalSchemes
      };
      console.log('Saving flow configs payload', {
        accessRequestConfig: this.entitlementRequestConfig.accessRequestConfig,
        revocationRequestConfig: this.entitlementRequestConfig.revocationRequestConfig
      });
    } catch (e: any) {
      console.error('Failed to save flow configs', e);
      this.flowConfigError = e?.message || 'Failed to save flow configs';
    } finally {
      this.savingFlowConfigs = false;
    }
  }

  membersTabIndex = 3; // Details(0), Approval(1), Request(2), Members(3)
  historyTabIndex = 4; // Request History
  selectedTabIndex = 0;

  private buildMembersSearchRequest(count: boolean = false) {
    const term = (this.membersSearch || '').trim();
    const textTerms = term ? [term + '*'] : ['*'];
    // Base request matching working Postman JSON (without searchV2025 wrapper if SDK expects direct fields)
    const base: any = {
      includeNested: false,
      indices: ['identities'],
      filters: {
        'access.id': {
          type: 'TERMS',
            terms: [this.entitlement.id]
        }
      },
      queryType: 'TEXT',
      textQuery: {
        contains: true,
        fields: ['name', 'displayName', 'firstName', 'lastName'],
        matchAny: false,
        terms: textTerms
      },
      sort: ['+displayName'],
      from: this.membersPage * this.membersPageSize,
      size: this.membersPageSize
    };
    if (count) (base as any).count = true;
    return { primary: { searchV2025: base }, raw: base };
  }

  onTabChange(idx: number) {
    this.selectedTabIndex = idx;
    if (idx === this.membersTabIndex && !this.entitlementMembers.length && !this.loadingMembers) {
      this.fetchEntitlementMembers(true);
    }
    if (idx === this.historyTabIndex && !this.requestHistory.length && !this.loadingHistory) {
      this.fetchRequestHistory(true);
    }
  }

  async fetchEntitlementMembers(reset: boolean = false) {
    if (!this.entitlement?.id) return;
    if (reset) {
      this.membersPage = 0;
      this.entitlementMembers = [];
    }
    this.loadingMembers = true;
    this.membersError = null;
    try {
      const { primary, raw } = this.buildMembersSearchRequest();
      let res: any;
      try {
        res = await this.sdk.searchPost(primary as any);
      } catch {
        res = await this.sdk.searchPost(raw as any);
      }
      const data = (res && res.data) || [];
      this.entitlementMembers = [
        ...this.entitlementMembers,
        ...data.map((d: any) => ({ id: d.id, displayName: d.displayName || d.name || d.id, name: d.name, email: d.email }))
      ];
      const totalHeader = res?.headers?.['x-total-count'];
      if (totalHeader) {
        this.membersTotal = Number(totalHeader);
      } else if (Array.isArray(data) && data.length < this.membersPageSize) {
        this.membersTotal = this.entitlementMembers.length;
      } else {
        this.membersTotal = Math.max(this.membersTotal, (this.membersPage + 1) * this.membersPageSize + 1);
      }
      this.membersPage++;
    } catch (e: any) {
      console.error('Failed to load entitlement members', e);
      this.membersError = e?.message || 'Failed to load members';
    } finally {
      this.loadingMembers = false;
    }
  }

  async fetchRequestHistory(reset: boolean = false) {
    if (!this.entitlement?.id) return;
    if (reset) {
      this.historyPage = 0;
      this.requestHistory = [];
    }
    this.loadingHistory = true;
    this.historyError = null;
    try {
      // Placeholder search: assuming requests index name 'requests' and field 'items.access.id' linking entitlements inside a request items array.
      // Adjust query as needed when real schema known.
      const term = (this.historySearch || '').trim();
      let query = `items.access.id:${this.entitlement.id}`;
      if (term) {
        const esc = term.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
        query += ` AND (requestedFor.displayName:*${esc}* OR requestedFor.name:*${esc}* OR requester.displayName:*${esc}* OR requester.name:*${esc}*)`;
      }
      const payload: any = {
        searchV2025: {
          indices: ['requests'],
          query: { query },
          sort: ['-created'],
          from: this.historyPage * this.historyPageSize,
          size: this.historyPageSize
        }
      };
      const res = await this.sdk.searchPost(payload);
      const docs = res.data || [];
      const mapped = docs.map((d: any) => ({
        id: d.id,
        state: d.state || d.status,
        type: d.type,
        requester: d.requester?.displayName || d.requester?.name || d.requester?.id,
        requestedFor: (d.items && d.items[0]?.requestedFor?.displayName) || d.items?.[0]?.requestedFor?.name || d.items?.[0]?.requestedFor?.id,
        created: d.created,
        modified: d.modified || d.completed,
        decisions: d.decisions || d.approvals || []
      }));
      this.requestHistory = [...this.requestHistory, ...mapped];
      const totalHeader = res?.headers?.['x-total-count'];
      if (totalHeader) {
        this.historyTotal = Number(totalHeader);
      } else if (docs.length < this.historyPageSize) {
        this.historyTotal = this.requestHistory.length;
      } else {
        this.historyTotal = Math.max(this.historyTotal, (this.historyPage + 1) * this.historyPageSize + 1);
      }
      this.historyPage++;
    } catch (e: any) {
      console.error('Failed to load request history', e);
      this.historyError = e?.message || 'Failed to load request history';
    } finally {
      this.loadingHistory = false;
    }
  }

  // Governance group helper methods (restored after earlier truncation)
  async fetchAllGovernanceGroupMembers() {
    const allSchemes = [
      ...(this.entitlementRequestConfig?.accessRequestConfig?.approvalSchemes || []),
      ...(this.entitlementRequestConfig?.revocationRequestConfig?.approvalSchemes || [])
    ];
    for (const scheme of allSchemes) {
      if (scheme.approverType === 'GOVERNANCE_GROUP' && scheme.approverId) {
        try {
          const res = await this.sdk.listWorkgroupMembers({ workgroupId: scheme.approverId });
          this.governanceGroupMembers[scheme.approverId] = res.data;
        } catch (e) {
          console.warn('Failed to fetch members for group', scheme.approverId, e);
        }
      }
    }
  }

  async refreshGroupMembers(groupId: string) {
    try {
      const res = await this.sdk.listWorkgroupMembers({ workgroupId: groupId });
      this.governanceGroupMembers[groupId] = res.data;
    } catch (e) {
      console.warn('Failed to refresh group members', groupId, e);
    }
  }

  async addMemberToGroup(groupId: string, identityId: string) {
    await this.sdk.updateWorkgroupMembers({ workgroupId: groupId, members: [{ type: 'IDENTITY', id: identityId }] } as any);
    await this.refreshGroupMembers(groupId);
  }

  async removeMemberFromGroup(groupId: string, memberId: string) {
    await this.sdk.deleteWorkgroupMembers({ workgroupId: groupId, members: [{ type: 'IDENTITY', id: memberId }] } as any);
    await this.refreshGroupMembers(groupId);
  }

  async searchIdentity(groupId: string) {
    this.selectedGroupId = groupId;
    const res = await this.sdk.listWorkgroupMembers({ workgroupId: groupId });
    this.memberSearchResults = res.data.filter((m: any) =>
      m.displayName?.toLowerCase().includes(this.memberSearch.toLowerCase()) ||
      m.name?.toLowerCase().includes(this.memberSearch.toLowerCase())
    );
  }

  async onIdentityDrop(event: any, groupId: string) {
    if (event.previousContainer !== event.container) {
      const identity = event.previousContainer.data[event.previousIndex];
      await this.addMemberToGroup(groupId, identity.id);
      this.availableIdentities = this.availableIdentities.filter(i => i.id !== identity.id);
    }
    await this.refreshGroupMembers(groupId);
  }
}
