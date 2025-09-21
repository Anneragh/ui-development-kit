import { Router } from '@angular/router';
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { EntitlementDocumentsV2025 } from 'sailpoint-api-client';
// import { SearchV2025ApiSearchPostRequest } from '../../sailpoint-sdk.service'; // Removed: not exported

@Component({
  selector: 'app-manage-objects-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, RouterModule],
  templateUrl: './manage-objects-list.component.html',
  styleUrls: ['./manage-objects-list.component.scss']
})
export class ManageObjectsListComponent implements OnInit {
  data: any[] = [];
  displayedColumns: string[] = ['name', 'description', 'privileged', 'requestable', 'sourceName', 'actions'];
  title: string = 'Manage Objects';
  identityId: string = 'd0d85d39b4fe4734beb2a4114fbbc5c9';
  constructor(private route: ActivatedRoute, private sdk: SailPointSDKService, private router: Router) {}
  manage(element: any) {
    const type = this.route.snapshot.paramMap.get('type');
    if (type && element.id) {
      this.router.navigate([`/entitlement-details`, type, element.id]);
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type');
      if (type) {
        this.title = `Manage ${type.charAt(0).toUpperCase() + type.slice(1)} I own`;
        this.loadData(type);
      }
    });
  }

  async loadData(type: string) {
    if (type === 'entitlements') {         
        await this.getEntitlements();      
    } else if (type === 'roles') {
      const resp = await this.sdk.listRoles({});
      this.data = (resp.data || []).map(r => ({ name: r.name, description: r.description, etc: r.id }));
    } else if (type === 'accessProfiles') {
      const resp = await this.sdk.listAccessProfiles({});
      this.data = (resp.data || []).map(a => ({ name: a.name, description: a.description, etc: a.id }));
    }
  }


  async getEntitlements() {
      
     const request: any = {
        searchV2025: {
          indices: ['entitlements'],
          query: {
            query: "owner.id:" + this.identityId
          },       
        },
         count: true
      };
     const res = await this.sdk.searchPost( request );
     console.log('Entitlements response:', res);
     this.data = (res.data || []).map((e: any) => ({
       id: e.id ?? '',
       name: e.displayName ?? e.name ?? '',
    description: e.description ??  '',
       privileged: typeof e.privileged === 'boolean' ? e.privileged : false,
       requestable: typeof e.requestable === 'boolean' ? e.requestable : false,
       sourceName: (e.source && (e.source.displayName ?? e.source.name)) || ''
     }));
    
  }
  
  async getRolesCount() {
     const request: any = {
        searchV2025: {
          indices: ['roles'],
          query: {
            query: "owner.id:" + this.identityId
          },       
        },
         count: true
      };
     const res = await this.sdk.searchPost( request )
     
     //this.rolesCount =res.headers['x-total-count'] ? Number(res.headers['x-total-count']) : 0;
  
    }
  
  async getAccessProfileCount() {
      const request: any = {
        searchV2025: {
          indices: ['accessprofiles'],
          query: {
            query: "owner.id:" + this.identityId
          },       
        },
         count: true
      };
     const res = await this.sdk.searchPost( request )
     
    // this.accessProfilesCount = res.headers['x-total-count'] ? Number(res.headers['x-total-count']) : 0;
  
    }
}
