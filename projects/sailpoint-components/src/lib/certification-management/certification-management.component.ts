import { AccessTokenStatus } from './../../../../../src/global.d';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
//import { createOpenAI } from '@ai-sdk/openai';
//import { generateObject } from 'ai';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SailPointSDKService } from '../sailpoint-sdk.service';
import {
  IdentityCertificationDtoV2025,
  IdentityReferenceWithNameAndEmailV2025,
  AccessReviewItemV2025,
} from 'sailpoint-api-client';
import { GenericDialogComponent } from '../generic-dialog/generic-dialog.component';
import { ConnectionService } from 'src/app/services/connection.service';
import { ElectronApiFactoryService } from 'sailpoint-components';

// Interface for comprehensive certification details
interface CertificationDetails {
  certification: IdentityCertificationDtoV2025;
  reviewers: any[];
  accessReviewItems: any[];
  errors?: string[];
}

@Component({
  selector: 'app-certification-management',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
    MatDialogModule,
  ],
  templateUrl: './certification-management.component.html',
  styleUrl: './certification-management.component.scss',
})
export class CertificationManagementComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  title = 'Certification Management';
  certifications: IdentityCertificationDtoV2025[] = [];
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

  constructor(
    private sdk: SailPointSDKService,
    private dialog: MatDialog,
    private electronService: ElectronApiFactoryService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit() {
    // Monitor environment changes and load OpenAI API Key
    this.subscriptions.add(
      this.connectionService.currentEnvironment$.subscribe(async (env) => {
        if (env?.name) {
          //await this.loadOpenAIApiKey(env.name);
          //void this.generateJoke();
        }
      })
    );

    // load certifications
    void this.getCertificationManagement();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }


  async getCertificationManagement() {
    this.loading = true;
    try {
      const res = await this.sdk.listIdentityCertifications();
      console.log('Full API response:', res);
      console.log('Certifications data:', res.data);
      console.log('Data length:', res.data?.length);
      if (res.status === 200) {
        this.certifications = res.data || [];
        console.log('Certifications set to:', this.certifications);
      } else {
        console.error('Error loading certifications:', res.statusText);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      this.loading = false;
    }
  }

  // View certification details in dialog
  async onView(certification: IdentityCertificationDtoV2025): Promise<void> {
    try {
      if (!certification.id) {
        this.openMessageDialog('Certification ID is missing.', 'Error');
        return;
      }

      // Initialize certification details structure
      const certificationDetails: CertificationDetails = {
        certification: certification,
        reviewers: [],
        accessReviewItems: [],
        errors: [],
      };

      // Collect all data with proper error handling
      const promises = [
        this.fetchCertificationDetails(certification.id),
        this.fetchReviewers(certification.id),
        this.fetchAccessReviewItems(certification.id),
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

      // Display the comprehensive certification details
      const details = JSON.stringify(certificationDetails, null, 2);
      this.openMessageDialog(
        details,
        `Certification Details: ${certification.name || certification.id}`
      );
    } catch (error) {
      this.openMessageDialog(
        `Failed to load certification details: ${String(error)}`,
        'Error'
      );
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

  
}
