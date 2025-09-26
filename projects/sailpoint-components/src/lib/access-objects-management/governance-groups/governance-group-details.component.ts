import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { SailPointSDKService } from '../../sailpoint-sdk.service';

@Component({
  selector: 'app-governance-group-details',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatTableModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './governance-group-details.component.html',
  styleUrls: ['./governance-group-details.component.scss']
})
export class GovernanceGroupDetailsComponent implements OnInit {
  groupId!: string;
  group: any = null;
  loadingGroup = false;
  members: any[] = [];
  loadingMembers = false;
  associated: { roles: any[]; entitlements: any[]; sources: any[]; accessProfiles: any[] } = { roles: [], entitlements: [], sources: [], accessProfiles: [] };
  loadingAssociated = false;

  memberColumns = ['name','type'];
  assocColumns = ['type','name','id'];

  constructor(private route: ActivatedRoute, private sdk: SailPointSDKService) {}

  async ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id')!;
    await this.loadGroup();
    await this.loadMembers();
    await this.loadAssociated();
  }

  async loadGroup() {
    this.loadingGroup = true;
    try {
      // Placeholder: fetch single group via search
      const res = await this.sdk.searchPost({
        searchV2025: { indices: ['workgroups'], query: { query: `id:${this.groupId}` }, size: 1 }
      } as any);
      this.group = (res.data || [])[0];
    } finally { this.loadingGroup = false; }
  }

  async loadMembers() {
    this.loadingMembers = true;
    try {
      // Placeholder: if group has members array
      this.members = (this.group?.members || []).map((m: any) => ({ name: m.displayName || m.name || m.id, type: m.type || 'IDENTITY' }));
    } finally { this.loadingMembers = false; }
  }

  async loadAssociated() {
    this.loadingAssociated = true;
    try {
      // Placeholder implementation: search objects referencing this governance group as approverId
      const queries = [
        { key: 'entitlements', index: 'entitlements' },
        { key: 'roles', index: 'roles' },
        { key: 'accessProfiles', index: 'access_profiles' },
        { key: 'sources', index: 'sources' }
      ];
      for (const q of queries) {
        try {
          const res = await this.sdk.searchPost({
            searchV2025: {
              indices: [q.index],
              query: { query: `accessRequestConfig.approvalSchemes.approverId:${this.groupId}` },
              size: 50
            }
          } as any);
          (this.associated as any)[q.key] = (res.data || []).map((o: any) => ({
            type: q.key.slice(0,-1),
            name: o.displayName || o.name || o.id,
            id: o.id
          }));
        } catch (e) {
          (this.associated as any)[q.key] = [];
        }
      }
    } finally { this.loadingAssociated = false; }
  }
}
