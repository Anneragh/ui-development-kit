import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ElectronApiFactoryService, SailPointSDKService } from 'sailpoint-components';
import { ConnectionService } from 'src/app/services/connection.service';
import { SearchV2025ApiSearchPostRequest } from 'sailpoint-api-client';


@Component({
  selector: 'app-access-objects-management',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './access-objects-management.component.html',
  styleUrl: './access-objects-management.component.scss',
})
export class AccessObjectsManagementComponent implements OnInit, OnDestroy{



    entitlementsCount: number = 0;
    rolesCount: number = 0;
    accessProfilesCount: number = 0;
    identityId: string = 'd0d85d39b4fe4734beb2a4114fbbc5c9';
    loading = true;

  constructor(
    private sdk: SailPointSDKService,    
    private electronService: ElectronApiFactoryService,
    private connectionService: ConnectionService,
    private router: Router
  ) {console.log('AccessObjectsManagementComponent constructed');}
  goToManage(cardType: string) {
    console.log(`Navigating to manage ${cardType}`);
    this.router.navigate(['/access-objects-management', cardType]);
  }
    ngOnDestroy(): void {
        // Clean up any subscriptions or resources here if needed
        console.log('AccessObjectsManagementComponent destroyed');
    }
  
  ngOnInit(): void {
   
    console.log('ngOnInit called');
    Promise.all([
        this.getEntitlementsCount(),
        this.getRolesCount(),
        this.getAccessProfileCount()
    ]).finally(() => {
        this.loading = false;
        console.log("All counts fetched");
        
    });
  }

async getEntitlementsCount() {
    
   const request: SearchV2025ApiSearchPostRequest = {
      searchV2025: {
        indices: ['entitlements'],
        query: {
          query: "owner.id:" + this.identityId
        },       
      },
       count: true
    };
   const res = await this.sdk.searchPost( request )  
   this.entitlementsCount = res.headers['x-total-count'] ? Number(res.headers['x-total-count']) : 0;
 
  
}

async getRolesCount() {
   const request: SearchV2025ApiSearchPostRequest = {
      searchV2025: {
        indices: ['roles'],
        query: {
          query: "owner.id:" + this.identityId
        },       
      },
       count: true
    };
   const res = await this.sdk.searchPost( request )
   
   this.rolesCount =res.headers['x-total-count'] ? Number(res.headers['x-total-count']) : 0;

  }

async getAccessProfileCount() {
    const request: SearchV2025ApiSearchPostRequest = {
      searchV2025: {
        indices: ['accessprofiles'],
        query: {
          query: "owner.id:" + this.identityId
        },       
      },
       count: true
    };
   const res = await this.sdk.searchPost( request )
   
   this.accessProfilesCount = res.headers['x-total-count'] ? Number(res.headers['x-total-count']) : 0;

  }

getSources() {
    alert('Other action...');
  }
  
}
