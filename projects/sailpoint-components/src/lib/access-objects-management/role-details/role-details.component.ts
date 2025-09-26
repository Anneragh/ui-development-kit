import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-role-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatTabsModule, MatIconModule, MatButtonModule, MatChipsModule, DragDropModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatCheckboxModule, MatProgressBarModule, MatButtonToggleModule, MatPaginatorModule, MatTooltipModule, RouterModule],
  templateUrl: './role-details.component.html',
  styleUrls: ['./role-details.component.scss']
})
export class RoleDetailsComponent implements OnInit {
  role: any = null;
  // Description editing now always visible
  descriptionValue = '';
  // Enable/disable state
  togglingEnabled = false;

  // Request / Flow config parity (access + revocation)
  accessRequestConfigValues: any = { requestCommentRequired: false, denialCommentRequired: false, reauthorizationRequired: false };
  revocationRequestConfigValues: any = { requestCommentRequired: false, denialCommentRequired: false, reauthorizationRequired: false };
  savingFlowConfigs = false; flowConfigError: string | null = null;

  // Request config parity
  requestableValue = false;
  savingRequestConfig = false;
  requestConfigError: string | null = null;

  // Approval schemes parity (placeholders; adapt when role approval APIs available)
  editableApprovalSchemes: any[] = [];
  accessApprovalSchemes: any[] = [];
  revocationApprovalSchemes: any[] = [];
  approverTypes = [
    { value: 'MANAGER', label: 'Manager' },
    { value: 'OWNER', label: 'Owner' },
    { value: 'GOVERNANCE_GROUP', label: 'Governance Group' }
  ];
  workgroupSearchControl: FormControl = new FormControl('');
  filteredWorkgroups: any[] = [];
  private workgroupSearchTimeout: any;

  // Members (identities granted this role)
  roleMembers: any[] = [];
  loadingMembers = false;
  membersError: string | null = null;
  membersSearch = '';
  membersPage = 0; // zero-based page index for paginator
  membersPageSize = 10;
  membersPageSizeOptions: number[] = [10, 20, 50, 100];
  membersTotal = 0;
  // Client-side filter for members
  membersFilterTerm = '';
  filteredRoleMembers: any[] = [];

  // Request history
  requestHistory: any[] = [];
  loadingHistory = false;
  historyError: string | null = null;
  historyPage = 0;
  historyPageSize = 25;
  historyTotal = 0;
  historySearch = '';
  // Dummy history toggle
  USE_DUMMY_HISTORY = true;

  // Tab indices after moving Manage Access to second position:
  // 0 Details,1 Manage Access,2 Approval,3 Request Config,4 Members,5 Request History
  manageAccessTabIndex = 1;
  membersTabIndex = 3; // Adjusted to actual Members tab index after tab additions
  historyTabIndex = 5;
  selectedTabIndex = 0;

  // Manage Access state
  manageAccessType: 'accessProfiles' | 'entitlements' = 'entitlements';
  associatedAccessProfiles: any[] = [];
  associatedEntitlements: any[] = [];
  associatedEntitlementsFilterTerm = '';
  filteredAssociatedEntitlements: any[] = [];
  associatedEntitlementsDebounce: any;
  accessLoading = false;
  accessSaving = false;
  accessError: string | null = null;
  accessSearchTerm = '';
  availableResults: any[] = [];
  availableLoading = false;
  // Access profile dropdown data
  accessProfileOptions: any[] = []; accessProfileOptionsLoading = false; filteredAccessProfileOptions: any[] = []; accessProfileFilterTerm = ''; accessProfileFilterDebounce: any;
  pendingAccessProfileAdds: any[] = [];
  // Entitlement dropdown data
  entitlementOptions: any[] = [];
  entitlementOptionsLoading = false;
  entitlementFilterTerm = '';
  filteredEntitlementOptions: any[] = [];
  selectedEntitlementIds: string[] = [];
  allEntitlementsSelected = false;
  entitlementSearchDebounce: any;
  // New single-add dropdown pending queue
  pendingEntitlementAdds: any[] = [];
  // Access profile filtering restored
  apAssocFilterTerm = '';
  apAssocFilterDebounce: any;
  filteredAccessProfiles: any[] = [];
  // Enrichment loading flags
  enrichingEntitlements = false;
  enrichingAccessProfiles = false;

  constructor(private route: ActivatedRoute, private sdk: SailPointSDKService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadRole(id);
    }
  }

  async loadRole(id: string) {
    try {
      const res: any = await (this.sdk as any).getRole({ id });
  this.role = res.data;
  this.descriptionValue = this.role?.description || '';
      this.requestableValue = !!this.role?.requestable;
      // Initialize flow configs if present on role
      if (this.role?.accessRequestConfig) {
        this.accessRequestConfigValues = {
          requestCommentRequired: !!this.role.accessRequestConfig.requestCommentRequired,
          denialCommentRequired: !!this.role.accessRequestConfig.denialCommentRequired,
          reauthorizationRequired: !!this.role.accessRequestConfig.reauthorizationRequired
        };
        // Load approval schemes for editing from access request config
        const schemes = this.role.accessRequestConfig.approvalSchemes || [];
        this.editableApprovalSchemes = schemes.map((s: any) => ({
          approverType: s.approverType || s.type || 'MANAGER',
          approverId: s.approverId || null,
          pendingIdentities: [],
          identityInputValue: ''
        }));
      }
      if (this.role?.revocationRequestConfig) {
        this.revocationRequestConfigValues = {
          requestCommentRequired: !!this.role.revocationRequestConfig.requestCommentRequired,
          denialCommentRequired: !!this.role.revocationRequestConfig.denialCommentRequired,
          reauthorizationRequired: !!this.role.revocationRequestConfig.reauthorizationRequired
        };
      }
      this.extractAssociatedAccess();
  // Kick off enrichment for default tab (entitlements) in background
  this.enrichEntitlementsDetails();
      // TODO: fetch role request/approval config if/when API available
    } catch (e) {
      console.error('Failed to load role', e);
    }
  }

  private extractAssociatedAccess() {
    if (!this.role) return;
    // Heuristic: role.accessProfiles or role.accessProfilesIds etc.
    const ap = (this.role.accessProfiles || this.role.accessprofiles || this.role.accessProfilesIds || []).map((p: any) => typeof p === 'string' ? { id: p } : p);
    this.associatedAccessProfiles = ap;
    const ents = (this.role.entitlements || this.role.entitlementIds || []).map((e: any) => typeof e === 'string' ? { id: e } : e);
  this.associatedEntitlements = ents;
  this.applyAssociatedEntitlementsFilter();
  }

  async updateDescription() {
    if (!this.role?.id) return;
    try {
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: [{ op: 'replace', path: '/description', value: this.descriptionValue }] });
      await this.loadRole(this.role.id);
    } catch (e) {
      console.error('Failed to update role description', e);
    }
  }

  async toggleRoleEnabled() {
    if (!this.role?.id || this.togglingEnabled) return;
    this.togglingEnabled = true;
    const newVal = !this.role?.enabled;
    try {
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: [{ op: this.role.hasOwnProperty('enabled') ? 'replace' : 'add', path: '/enabled', value: newVal }] });
      await this.loadRole(this.role.id);
    } catch (e) {
      console.error('Failed to toggle enabled', e);
    } finally { this.togglingEnabled = false; }
  }

  onTabChange(idx: number) {
    this.selectedTabIndex = idx;
    if (idx === this.manageAccessTabIndex && !this.accessLoading && !this.associatedAccessProfiles.length && !this.associatedEntitlements.length) {
      // ensure access data present (already extracted on load, but reload if missing)
      this.extractAssociatedAccess();
    }
    if (idx === this.manageAccessTabIndex) {
      // Enrich whichever current type is selected
      if (this.manageAccessType === 'entitlements') this.enrichEntitlementsDetails();
      else this.enrichAccessProfilesDetails();
    }
    if (idx === this.membersTabIndex && !this.roleMembers.length && !this.loadingMembers) {
      this.fetchRoleMembers(true);
    }
    if (idx === this.historyTabIndex && !this.requestHistory.length && !this.loadingHistory) {
      this.fetchRequestHistory(true);
    }
  }

  onAccessTypeChange() {
    this.availableResults = [];
    this.accessSearchTerm = '';
    if (this.manageAccessType === 'entitlements' && !this.entitlementOptions.length) {
      this.loadEntitlementOptions();
    }
    if (this.manageAccessType === 'accessProfiles' && !this.accessProfileOptions.length) {
      this.loadAccessProfileOptions();
    }
  // Enrich when switching types
  if (this.manageAccessType === 'entitlements') this.enrichEntitlementsDetails();
  else this.enrichAccessProfilesDetails();
  }

  // Dropdown loading for access profiles
  async loadAccessProfileOptions() {
    if (!this.role?.id) return;
    this.accessProfileOptionsLoading = true; this.accessError = null;
    try {
      const existingIds = new Set(this.associatedAccessProfiles.map(a => a.id));
      const payload: any = { searchV2025: { indices: ['accessprofiles'], query: { query: '*' }, size: 100, sort: ['+displayName'] } };
      const res = await this.sdk.searchPost(payload);
      const all = (res.data || []).map((a: any) => ({ id: a.id, displayName: a.displayName || a.name, name: a.name, description: a.description, sourceName: a.sourceName || a.source?.name }));
      this.accessProfileOptions = all.filter(a => !existingIds.has(a.id));
      this.applyAccessProfileFilter();
    } catch (e: any) { this.accessError = e?.message || 'Failed to load access profiles'; }
    finally { this.accessProfileOptionsLoading = false; }
  }

  onAccessProfileDropdownOpen(open: boolean) { if (open && !this.accessProfileOptions.length && !this.accessProfileOptionsLoading) this.loadAccessProfileOptions(); }

  onSelectAccessProfileToQueue(ap: any) {
    if (!ap) return; if (this.pendingAccessProfileAdds.some(p => p.id === ap.id)) return; if (this.associatedAccessProfiles.some(a => a.id === ap.id)) return;
    this.pendingAccessProfileAdds.push(ap);
  }

  removePendingAccessProfile(ap: any) { this.pendingAccessProfileAdds = this.pendingAccessProfileAdds.filter(p => p.id !== ap.id); }

  async savePendingAccessProfiles() {
    if (!this.pendingAccessProfileAdds.length) return;
    this.pendingAccessProfileAdds.forEach(p => { if (!this.associatedAccessProfiles.some(a => a.id === p.id)) this.associatedAccessProfiles.push({ id: p.id, name: p.displayName || p.name }); });
    this.pendingAccessProfileAdds = [];
    await this.persistAccessAssociations();
    this.enrichAccessProfilesDetails();
    // Remove newly added from dropdown options
    const ids = new Set(this.associatedAccessProfiles.map(a => a.id));
    this.accessProfileOptions = this.accessProfileOptions.filter(o => !ids.has(o.id));
    this.applyAccessProfileFilter();
  this.applyAccessProfilesAssocFilter();
  }

  private applyAccessProfileFilter() {
    const term = (this.accessProfileFilterTerm || '').toLowerCase().trim();
    if (!term) { this.filteredAccessProfileOptions = [...this.accessProfileOptions]; return; }
    this.filteredAccessProfileOptions = this.accessProfileOptions.filter(a => {
      const hay = `${a.displayName || a.name || ''} ${a.sourceName || ''} ${a.description || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }

  exportAssociatedEntitlements(format: 'csv' | 'json') {
    const rows = this.associatedEntitlements.map(e => ({
      id: e.id,
      name: e.displayName || e.name || '',
      description: e.description || '',
      source: e.sourceName || e.source?.name || ''
    }));
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      this.triggerDownload(blob, `role-${this.role?.id}-entitlements.json`);
      return;
    }
    // CSV
    const header = 'id,name,description,source';
    const csvLines = rows.map(r => [r.id, r.name, r.description?.replace(/"/g,'""'), r.source].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [header, ...csvLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.triggerDownload(blob, `role-${this.role?.id}-entitlements.csv`);
  }

  exportAssociatedAccessProfiles(format: 'csv' | 'json') {
    const rows = this.associatedAccessProfiles.map(a => ({
      id: a.id,
      name: a.displayName || a.name || '',
      description: a.description || '',
      source: a.sourceName || a.source?.name || ''
    }));
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      this.triggerDownload(blob, `role-${this.role?.id}-access-profiles.json`);
      return;
    }
    const header = 'id,name,description,source';
    const csvLines = rows.map(r => [r.id, r.name, r.description?.replace(/"/g,'""'), r.source].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [header, ...csvLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.triggerDownload(blob, `role-${this.role?.id}-access-profiles.csv`);
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  async loadEntitlementOptions() {
    if (!this.role?.id) return;
    this.entitlementOptionsLoading = true;
    this.accessError = null;
    try {
      // Exclude already associated entitlement IDs
      const existingIds = new Set(this.associatedEntitlements.map(e => e.id));
      // Basic query to fetch entitlements (limit 50) - adjust fields as needed
      const payload: any = { searchV2025: { indices: ['entitlements'], query: { query: '*'}, size: 100, sort: ['+displayName'] } };
      const res = await this.sdk.searchPost(payload);
      const all = (res.data || []).map((e: any) => ({ id: e.id, displayName: e.displayName || e.name, name: e.name, description: e.description, sourceName: e.sourceName || e.source?.name }));
      this.entitlementOptions = all.filter(e => !existingIds.has(e.id));
      this.applyEntitlementFilter();
    } catch (e: any) {
      this.accessError = e?.message || 'Failed to load entitlements';
    } finally {
      this.entitlementOptionsLoading = false;
    }
  }

  refreshEntitlementOptions() { this.loadEntitlementOptions(); }

  onEntitlementDropdownOpen(opened: boolean) {
    if (opened && !this.entitlementOptions.length && !this.entitlementOptionsLoading) {
      this.loadEntitlementOptions();
    }
  }

  onSelectEntitlementToQueue(ent: any) {
    if (!ent) return;
    if (this.pendingEntitlementAdds.some(p => p.id === ent.id)) return;
    if (this.associatedEntitlements.some(a => a.id === ent.id)) return; // already associated
    this.pendingEntitlementAdds.push(ent);
    // Remove from available list visually (optional) -> keep for now
  }

  removePendingEntitlement(ent: any) { this.pendingEntitlementAdds = this.pendingEntitlementAdds.filter(p => p.id !== ent.id); }

  async savePendingEntitlements() {
    if (!this.pendingEntitlementAdds.length) return;
    // Add to associated list first
    this.pendingEntitlementAdds.forEach(p => { if (!this.associatedEntitlements.some(a => a.id === p.id)) this.associatedEntitlements.push({ id: p.id, name: p.displayName || p.name }); });
    this.pendingEntitlementAdds = [];
    await this.persistAccessAssociations();
    this.enrichEntitlementsDetails();
    this.applyAssociatedEntitlementsFilter();
    // Remove newly added from entitlementOptions so they don't appear again
    const currentIds = new Set(this.associatedEntitlements.map(e => e.id));
    this.entitlementOptions = this.entitlementOptions.filter(e => !currentIds.has(e.id));
    this.applyEntitlementFilter();
  }

  onEntitlementFilterChange() {
    if (this.entitlementSearchDebounce) clearTimeout(this.entitlementSearchDebounce);
    this.entitlementSearchDebounce = setTimeout(() => this.applyEntitlementFilter(), 250);
  }

  private applyEntitlementFilter() {
    const term = (this.entitlementFilterTerm || '').toLowerCase().trim();
    if (!term) { this.filteredEntitlementOptions = [...this.entitlementOptions]; return; }
    this.filteredEntitlementOptions = this.entitlementOptions.filter(e => {
      const hay = `${e.displayName || e.name || ''} ${e.sourceName || ''} ${e.description || ''}`.toLowerCase();
      return hay.includes(term);
    });
  // no pagination
  }

  toggleEntitlementSelection(ent: any) {
    const idx = this.selectedEntitlementIds.indexOf(ent.id);
    if (idx >= 0) this.selectedEntitlementIds.splice(idx,1); else this.selectedEntitlementIds.push(ent.id);
    this.updateAllEntitlementsSelected();
  }
  isEntitlementSelected(ent: any) { return this.selectedEntitlementIds.includes(ent.id); }
  toggleAllEntitlements() {
    if (this.allEntitlementsSelected) {
      this.selectedEntitlementIds = [];
      this.allEntitlementsSelected = false;
    } else {
      this.selectedEntitlementIds = this.filteredEntitlementOptions.map(e => e.id);
      this.allEntitlementsSelected = true;
    }
  }
  private updateAllEntitlementsSelected() {
    this.allEntitlementsSelected = !!this.filteredEntitlementOptions.length && this.filteredEntitlementOptions.every(e => this.selectedEntitlementIds.includes(e.id));
  }

  async addSelectedEntitlements() {
    if (!this.selectedEntitlementIds.length) return;
    const newly = this.filteredEntitlementOptions.filter(e => this.selectedEntitlementIds.includes(e.id));
    // Add to associated list (avoid duplicates)
    newly.forEach(n => { if (!this.associatedEntitlements.some(a => a.id === n.id)) this.associatedEntitlements.push({ id: n.id, name: n.displayName || n.name }); });
    this.selectedEntitlementIds = [];
    this.allEntitlementsSelected = false;
    await this.persistAccessAssociations();
    this.enrichEntitlementsDetails();
    // Remove those from available options
    const addedSet = new Set(newly.map(n => n.id));
    this.entitlementOptions = this.entitlementOptions.filter(e => !addedSet.has(e.id));
    this.applyEntitlementFilter();
  // no pagination
  }

  isAlreadyAssociated(item: any): boolean {
    if (this.manageAccessType === 'accessProfiles') {
      return this.associatedAccessProfiles.some(a => a.id === item.id);
    }
    return this.associatedEntitlements.some(a => a.id === item.id);
  }

  async addAccessItem(item: any) {
    if (!this.role?.id || this.isAlreadyAssociated(item)) return;
    if (this.manageAccessType === 'accessProfiles') {
      this.associatedAccessProfiles.push({ id: item.id, name: item.displayName || item.name });
    } else {
      this.associatedEntitlements.push({ id: item.id, name: item.displayName || item.name });
    }
    await this.persistAccessAssociations();
  // Re-enrich after persistence
  if (this.manageAccessType === 'entitlements') this.enrichEntitlementsDetails(); else this.enrichAccessProfilesDetails();
  this.applyAssociatedEntitlementsFilter();
  }

  async removeAccessItem(item: any, type: 'accessProfiles' | 'entitlements') {
    if (type === 'accessProfiles') {
      this.associatedAccessProfiles = this.associatedAccessProfiles.filter(a => a.id !== item.id);
    } else {
      this.associatedEntitlements = this.associatedEntitlements.filter(a => a.id !== item.id);
    }
    await this.persistAccessAssociations();
  if (type === 'entitlements') this.enrichEntitlementsDetails(); else this.enrichAccessProfilesDetails();
  if (type === 'entitlements') this.applyAssociatedEntitlementsFilter();
  }

  private buildPatchOps(): any[] {
    const ops: any[] = [];
    // Optimistically replace arrays if they exist, otherwise add
    if (this.associatedAccessProfiles) {
  // Beta roles PATCH expects objects with id for relationships
  ops.push({ op: this.role.accessProfiles ? 'replace' : 'add', path: '/accessProfiles', value: this.associatedAccessProfiles.map(a => ({ id: a.id })) });
    }
    if (this.associatedEntitlements) {
  ops.push({ op: this.role.entitlements ? 'replace' : 'add', path: '/entitlements', value: this.associatedEntitlements.map(a => ({ id: a.id })) });
    }
    return ops;
  }

  private async enrichEntitlementsDetails() {
    if (!this.role?.id || !this.associatedEntitlements.length) return;
    // Skip if already have description & sourceName for most entries
    const needs = this.associatedEntitlements.some(e => !e.description || !e.sourceName);
    if (!needs) return;
    if (this.enrichingEntitlements) return;
    this.enrichingEntitlements = true;
    try {
      // If there were a dedicated endpoint roles/:id/entitlements, we'd call it; fall back to search by IDs
      const ids = this.associatedEntitlements.map(e => e.id).filter(Boolean);
      if (!ids.length) return;
      // Batch search (size = count of ids)
      const query = ids.map(id => `id:${id}`).join(' OR ');
      const payload: any = { searchV2025: { indices: ['entitlements'], query: { query: query }, size: ids.length } };
      const res = await this.sdk.searchPost(payload);
      const byId: Record<string, any> = {};
      (res.data || []).forEach((d: any) => { byId[d.id] = d; });
      this.associatedEntitlements = this.associatedEntitlements.map(e => ({
        ...e,
        displayName: e.displayName || byId[e.id]?.displayName || byId[e.id]?.name,
        name: e.name || byId[e.id]?.name,
        description: e.description || byId[e.id]?.description,
        sourceName: e.sourceName || byId[e.id]?.sourceName || byId[e.id]?.source?.name
      }));
      this.applyAssociatedEntitlementsFilter();
    } catch (err) {
      console.warn('Failed to enrich entitlements', err);
    } finally {
      this.enrichingEntitlements = false;
    }
  }

  onAssociatedEntitlementsFilterChange() {
    if (this.associatedEntitlementsDebounce) clearTimeout(this.associatedEntitlementsDebounce);
    this.associatedEntitlementsDebounce = setTimeout(() => this.applyAssociatedEntitlementsFilter(), 200);
  }

  private applyAssociatedEntitlementsFilter() {
    const term = (this.associatedEntitlementsFilterTerm || '').trim().toLowerCase();
    if (!term) { this.filteredAssociatedEntitlements = [...this.associatedEntitlements]; return; }
    this.filteredAssociatedEntitlements = this.associatedEntitlements.filter(e => {
      const hay = `${e.displayName || e.name || ''} ${e.sourceName || e.source?.name || ''} ${e.description || ''}`.toLowerCase();
      return hay.includes(term);
    });
  // no pagination
  }

  // Access profile associated filtering
  // Removed access profile associated filtering methods
  // Access profile search (no pagination helper methods)

  private async enrichAccessProfilesDetails() {
    if (!this.role?.id || !this.associatedAccessProfiles.length) return;
    const needs = this.associatedAccessProfiles.some(a => !a.description || !a.sourceName);
    if (!needs) return;
    if (this.enrichingAccessProfiles) return;
    this.enrichingAccessProfiles = true;
    try {
      const ids = this.associatedAccessProfiles.map(a => a.id).filter(Boolean);
      if (!ids.length) return;
      const query = ids.map(id => `id:${id}`).join(' OR ');
      const payload: any = { searchV2025: { indices: ['accessprofiles'], query: { query: query }, size: ids.length } };
      const res = await this.sdk.searchPost(payload);
      const byId: Record<string, any> = {};
      (res.data || []).forEach((d: any) => { byId[d.id] = d; });
      this.associatedAccessProfiles = this.associatedAccessProfiles.map(a => ({
        ...a,
        displayName: a.displayName || byId[a.id]?.displayName || byId[a.id]?.name,
        name: a.name || byId[a.id]?.name,
        description: a.description || byId[a.id]?.description,
        sourceName: a.sourceName || byId[a.id]?.sourceName || byId[a.id]?.source?.name
      }));
      this.applyAccessProfilesAssocFilter();
    } catch (err) {
      console.warn('Failed to enrich access profiles', err);
    } finally {
      this.enrichingAccessProfiles = false;
    }
  }

  onAccessProfilesAssocFilterChange() {
    if (this.apAssocFilterDebounce) clearTimeout(this.apAssocFilterDebounce);
    this.apAssocFilterDebounce = setTimeout(() => this.applyAccessProfilesAssocFilter(), 200);
  }

  private applyAccessProfilesAssocFilter() {
    const term = (this.apAssocFilterTerm || '').trim().toLowerCase();
    if (!term) { this.filteredAccessProfiles = [...this.associatedAccessProfiles]; }
    else {
      this.filteredAccessProfiles = this.associatedAccessProfiles.filter(a => {
        const hay = `${a.displayName || a.name || ''} ${a.sourceName || a.source?.name || ''} ${a.description || ''}`.toLowerCase();
        return hay.includes(term);
      });
    }
  }

  async persistAccessAssociations() {
    if (!this.role?.id) return;
    this.accessSaving = true;
    this.accessError = null;
    try {
      const ops = this.buildPatchOps();
      if (!ops.length) return;
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: ops });
      await this.loadRole(this.role.id); // refresh to sync
    } catch (e: any) {
      this.accessError = e?.message || 'Failed to update role access';
    } finally {
      this.accessSaving = false;
    }
  }

  private buildMembersSearchRequest() {
    const term = (this.membersSearch || '').trim();
    const textTerms = term ? [term + '*'] : ['*'];
    const base: any = {
      includeNested: false,
      indices: ['identities'],
      // assuming identities have roles array with id field (adjust when schema known)
      filters: {
        'access.role.id': {
          type: 'TERMS',
          terms: [this.role.id]
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
    return { primary: { searchV2025: base }, raw: base };
  }

  // Fetch members (identities assigned this role). No direct SDK endpoint found; using identities search fallback.
  async fetchRoleMembers(reset: boolean = false) {
    if (!this.role?.id) return;
    if (reset) {
      this.membersPage = 0;
    }
    this.loadingMembers = true;
    this.membersError = null;
    try {
      const offset = this.membersPage * this.membersPageSize;
      const limit = this.membersPageSize;
      const res: any = await (this.sdk as any).getRoleAssignedIdentities({ id: this.role.id, offset, limit });
      const pageData = (res.data || []).map((d: any) => ({ id: d.id, displayName: d.displayName || d.name || d.id, name: d.name, email: d.email }));
      // Replace current page (no accumulation) for paginator paging
      this.roleMembers = pageData;
      // Total from header if provided
      const totalHeader = res?.headers?.['x-total-count'] || res?.headers?.['X-Total-Count'];
      if (totalHeader) {
        this.membersTotal = Number(totalHeader);
      } else {
        // Fallback: if returned less than requested, we've reached end (approx total)
        if (pageData.length < limit) {
          this.membersTotal = this.membersPage * this.membersPageSize + pageData.length;
        } else {
          this.membersTotal = Math.max(this.membersTotal, (this.membersPage + 1) * this.membersPageSize + 1);
        }
      }
      this.applyMembersFilter();
    } catch (e:any) {
      console.error('Failed to load role members', e);
      this.membersError = e?.message || 'Failed to load members';
    } finally { this.loadingMembers = false; }
  }

  onMembersPageChange(event: PageEvent) {
    this.membersPageSize = event.pageSize;
    this.membersPage = event.pageIndex;
    this.fetchRoleMembers();
  }

  onMembersFilterChange() { this.applyMembersFilter(); }
  private applyMembersFilter() {
    const term = (this.membersFilterTerm || '').trim().toLowerCase();
    if (!term) { this.filteredRoleMembers = [...this.roleMembers]; return; }
    this.filteredRoleMembers = this.roleMembers.filter(m => {
      const hay = `${m.displayName || ''} ${m.name || ''} ${m.email || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }

  async fetchRequestHistory(reset: boolean = false) {
    if (this.USE_DUMMY_HISTORY) {
      if (reset || !this.requestHistory.length) {
        this.generateDummyRequestHistory();
      }
      return;
    }
    if (!this.role?.id) return;
    if (reset) {
      this.historyPage = 0;
      this.requestHistory = [];
    }
    this.loadingHistory = true;
    this.historyError = null;
    try {
      const term = (this.historySearch || '').trim();
      let query = `items.access.id:${this.role.id}`;
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

  buildHistoryTooltip(r: any): string {
    if (!r) return '';
    const requested = new Date(r.created).toLocaleString();
    const provisioned = r.provisioned ? new Date(r.provisioned).toLocaleString() : (r.modified ? new Date(r.modified).toLocaleString() : '—');
    const approvals = r.approvals ? r.approvals.map((a:any)=>`Level ${a.level}: ${a.approver} (${new Date(a.approved).toLocaleString()})`).join('\n') : 'No approvals';
    return `Requester: ${r.requester}\nRequested For: ${r.requestedFor}\nRequested: ${requested}\nProvisioned: ${provisioned}\n${approvals}`;
  }

  private generateDummyRequestHistory() {
    const now = Date.now();
    const random = (min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
    const names = ['Alice','Bob','Carlos','Diana','Ethan','Fatima','Gaurav','Hannah','Ivan','Jade','Kwame','Liu','Mina','Noah','Omar','Priya','Quinn','Rosa','Sam','Tariq','Uma','Viktor','Wen','Xia','Yara','Zane'];
    const approverPool = [...names];
    const records:any[] = [];
    for (let i=0;i<50;i++) {
      const requestedOffsetDays = random(1,120);
      const created = new Date(now - requestedOffsetDays*86400000 - random(0,86400000)).toISOString();
      const provisioningDelayHrs = random(4,96);
      const provisioned = new Date(new Date(created).getTime() + provisioningDelayHrs*3600000).toISOString();
      const requester = names[random(0,names.length-1)];
      const approverLevels = random(1,3);
      const approvers:any = {}; // legacy map
      const approvals:any[] = []; // detailed entries
      let approvalTime = new Date(created).getTime() + random(1,6)*3600000;
      for (let lvl=1; lvl<=approverLevels; lvl++) {
        const count = random(1,2);
        const picked:string[] = [];
        for (let c=0;c<count;c++) {
          const user = approverPool[random(0,approverPool.length-1)];
          picked.push(user);
          approvalTime += random(1,6)*3600000;
          approvals.push({ level: lvl, approver: user, approved: new Date(approvalTime).toISOString() });
        }
        approvers['level'+lvl] = picked;
      }
      const approverSummary = approvals.map(a=>`L${a.level}:${a.approver}`).join(', ');
      records.push({
        id: 'REQ-DUMMY-' + (i+1).toString().padStart(3,'0'),
        state: 'COMPLETED',
        type: 'ACCESS',
        requester,
        requestedFor: requester,
        created,
        modified: provisioned,
        provisioned,
        approvers,
        approvals,
        approverSummary,
        decisions: []
      });
    }
    records.sort((a,b)=> (a.created < b.created ? 1 : -1));
    this.requestHistory = records;
    this.historyTotal = records.length;
  }

  buildApproverTooltip(r:any): string {
    if (!r?.approvals?.length) return 'No approvals';
    return r.approvals
      .sort((a:any,b:any)=> a.level === b.level ? (a.approved < b.approved ? -1:1) : a.level - b.level)
      .map((a:any)=> `Level ${a.level} approved by ${a.approver} on ${new Date(a.approved).toLocaleString()}`)
      .join('\n');
  }

  addApprovalStep() {
  this.editableApprovalSchemes.push({ approverType: 'MANAGER', approverId: null, pendingIdentities: [], identityInputValue: '' });
  }
  removeApprovalStep(i: number) { this.editableApprovalSchemes.splice(i,1); }
  dropApprovalStep(event: CdkDragDrop<any[]>) { if (event.previousIndex !== event.currentIndex) moveItemInArray(this.editableApprovalSchemes, event.previousIndex, event.currentIndex); }

  async saveRequestConfig() {
    if (!this.role?.id) return;
    this.savingRequestConfig = true;
    this.requestConfigError = null;
    try {
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: [{ op: 'replace', path: '/requestable', value: this.requestableValue }] });
      await this.loadRole(this.role.id);
    } catch (e: any) {
      this.requestConfigError = e?.message || 'Failed to save';
    } finally {
      this.savingRequestConfig = false;
    }
  }

  async saveFlowConfigs() {
    if (!this.role?.id) return;
    this.savingFlowConfigs = true; this.flowConfigError = null;
    try {
      const ops: any[] = [];
      // Access request config
      if (this.role?.accessRequestConfig) {
        ops.push({ op: 'replace', path: '/accessRequestConfig', value: { ...(this.role.accessRequestConfig || {}), ...this.accessRequestConfigValues } });
      } else {
        ops.push({ op: 'add', path: '/accessRequestConfig', value: { ...this.accessRequestConfigValues } });
      }
      if (this.role?.revocationRequestConfig) {
        ops.push({ op: 'replace', path: '/revocationRequestConfig', value: { ...(this.role.revocationRequestConfig || {}), ...this.revocationRequestConfigValues } });
      } else {
        ops.push({ op: 'add', path: '/revocationRequestConfig', value: { ...this.revocationRequestConfigValues } });
      }
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: ops });
      await this.loadRole(this.role.id);
    } catch (e:any) {
      console.error('Failed to save flow configs', e);
      this.flowConfigError = e?.message || 'Failed to save flow configs';
    } finally { this.savingFlowConfigs = false; }
  }

  async saveApprovalConfig() {
    if (!this.role?.id) return;
    this.savingFlowConfigs = true; // reuse flag for spinner
    this.flowConfigError = null;
    try {
      const currentAccess = this.role.accessRequestConfig || {};
      const newAccess = {
        ...currentAccess,
        approvalSchemes: this.editableApprovalSchemes.map((s: any) => ({
          approverType: s.approverType,
          approverId: s.approverType === 'GOVERNANCE_GROUP' ? s.approverId : undefined
        }))
      };
      const op = this.role.accessRequestConfig ? 'replace' : 'add';
      await (this.sdk as any).patchRole({ id: this.role.id, jsonPatchOperationV2025: [{ op, path: '/accessRequestConfig', value: newAccess }] });
      await this.loadRole(this.role.id);
    } catch (e:any) {
      console.error('Failed to save approval config', e);
      this.flowConfigError = e?.message || 'Failed to save approval config';
    } finally {
      this.savingFlowConfigs = false;
    }
  }
}
