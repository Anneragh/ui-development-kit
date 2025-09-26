import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SailPointSDKService } from '../../sailpoint-sdk.service';

@Component({
  selector: 'app-governance-groups-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, FormsModule, MatInputModule, MatFormFieldModule],
  templateUrl: './governance-groups-list.component.html',
  styleUrls: ['./governance-groups-list.component.scss']
})
export class GovernanceGroupsListComponent implements OnInit {
  loading = false;
  error: string | null = null;
  search = '';
  displayedColumns: string[] = ['name','description','memberCount','actions'];
  groups: any[] = [];

  constructor(private sdk: SailPointSDKService, private router: Router) {}

  async ngOnInit() {
    await this.loadGroups();
  }

  async loadGroups() {
    this.loading = true; this.error = null;
    try {
      // Placeholder search call: adjust index/filter when API available
      const res = await this.sdk.searchPost({
        searchV2025: {
          indices: ['workgroups'],
          query: { query: this.search ? `name:*${this.search}* OR displayName:*${this.search}*` : '*'},
          sort: ['+name'],
          size: 100
        }
      } as any);
      this.groups = (res.data || []).map((g: any) => ({
        id: g.id,
        name: g.displayName || g.name || g.id,
        description: g.description || '',
        memberCount: g.memberCount || g.members?.length || 0
      }));
    } catch (e: any) {
      console.error('Failed to load governance groups', e);
      this.error = e?.message || 'Failed to load governance groups';
    } finally {
      this.loading = false;
    }
  }

  clearSearch() { this.search = ''; this.loadGroups(); }

  viewDetails(group: any) { this.router.navigate(['/governance-group-details', group.id]); }
}
