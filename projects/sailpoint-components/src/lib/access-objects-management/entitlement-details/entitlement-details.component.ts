import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SailPointSDKService } from '../../sailpoint-sdk.service';

@Component({
  selector: 'app-entitlement-details',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DragDropModule],
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
      try {
        const configRes = await this.sdk.getEntitlementRequestConfig({ id });
        console.log('Fetched entitlement-request-config:', configRes.data);
        this.entitlementRequestConfig = configRes.data;
        // Fetch governance group members for all approval schemes
        this.fetchAllGovernanceGroupMembers();
      } catch (e) {
        console.error('Failed to fetch entitlement-request-config:', e);
      }
    }
  }

  async fetchAllGovernanceGroupMembers() {
    const allSchemes = [
      ...(this.entitlementRequestConfig?.accessRequestConfig?.approvalSchemes || []),
      ...(this.entitlementRequestConfig?.revocationRequestConfig?.approvalSchemes || [])
    ];
    for (const scheme of allSchemes) {
      if (scheme.approverType === 'GOVERNANCE_GROUP' && scheme.approverId) {
        const res = await this.sdk.listWorkgroupMembers({ workgroupId: scheme.approverId });
        this.governanceGroupMembers[scheme.approverId] = res.data;
      }
    }
  }

  async searchIdentity(groupId: string) {
    this.selectedGroupId = groupId;
    // Example: search identities by name (replace with actual SDK search if available)
    // This is a placeholder, you may need to use a real identity search API
    const res = await this.sdk.listWorkgroupMembers({ workgroupId: groupId });
    this.memberSearchResults = res.data.filter((m: any) =>
      m.displayName?.toLowerCase().includes(this.memberSearch.toLowerCase()) ||
      m.name?.toLowerCase().includes(this.memberSearch.toLowerCase())
    );
  }

  async addMemberToGroup(groupId: string, identityId: string) {
    await this.sdk.updateWorkgroupMembers({ workgroupId: groupId, members: [{ type: 'IDENTITY', id: identityId }] } as any);
    await this.refreshGroupMembers(groupId);
  }

  async removeMemberFromGroup(groupId: string, memberId: string) {
      await this.sdk.deleteWorkgroupMembers({ workgroupId: groupId, members: [{ type: 'IDENTITY', id: memberId }] } as any);
    await this.refreshGroupMembers(groupId);
  }

  async refreshGroupMembers(groupId: string) {
    const res = await this.sdk.listWorkgroupMembers({ workgroupId: groupId });
    this.governanceGroupMembers[groupId] = res.data;
  }

  /**
   * Handles drag-and-drop of identities into a governance group member list.
   * @param event Angular CDK drop event
   * @param groupId The governance group ID
   */
  async onIdentityDrop(event: any, groupId: string) {
    // If dropped from availableIdentities to group
    if (event.previousContainer !== event.container) {
      const identity = event.previousContainer.data[event.previousIndex];
      // Add member to group via API
      await this.addMemberToGroup(groupId, identity.id);
      // Remove from availableIdentities
      this.availableIdentities = this.availableIdentities.filter((i) => i.id !== identity.id);
    } else {
      // Optionally handle reordering within the same list
      // Use moveItemInArray if needed
    }
    await this.refreshGroupMembers(groupId);
  }
}
