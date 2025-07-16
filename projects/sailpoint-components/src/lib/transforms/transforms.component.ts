import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import {
  TransformReadV2025,
  TransformsV2025ApiDeleteTransformRequest,
} from 'sailpoint-api-client';
import { GenericDialogComponent } from '../generic-dialog/generic-dialog.component';
import { SailPointSDKService } from '../sailpoint-sdk.service';
import { TransformBuilderComponent } from './transform-builder/transform-builder.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-transforms',
  standalone: true,
  imports: [
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatButtonModule,
    TransformBuilderComponent,
    MatSnackBarModule,
    MatToolbarModule,
    MatIconModule,
  ],
  templateUrl: './transforms.component.html',
  styleUrl: './transforms.component.scss',
})
export class TransformsComponent implements OnInit {
  title = 'Transforms';
  transforms: TransformReadV2025[] = [];
  dataSource: MatTableDataSource<TransformReadV2025> = new MatTableDataSource();
  displayedColumns: string[] = ['id', 'name', 'type', 'internal', 'actions'];
  loading = false;
  hasDataLoaded = false; // ✅ Track data load state
  transform: TransformReadV2025 | undefined;
  editing = false;
  @ViewChild(TransformBuilderComponent)
  transformBuilder?: TransformBuilderComponent;

  constructor(
    private dialog: MatDialog,
    private sdk: SailPointSDKService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    void this.loadTransforms();
  }

  private async loadTransforms(): Promise<void> {
    this.loading = true;
    this.hasDataLoaded = false;

    try {
      const response = await this.sdk.listTransforms();
      this.transforms =
        response.data.filter((transform) => transform.internal !== true) ?? [];
      this.dataSource = new MatTableDataSource(this.transforms);
      this.hasDataLoaded = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.openMessageDialog(`Error loading transforms: ${message}`, 'Error');
    } finally {
      this.loading = false;
    }
  }

  openMessageDialog(errorMessage: string, title: string): void {
    this.dialog.open(GenericDialogComponent, {
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // async onEdit(transform: any) {
  //   await this.router.navigate(['/transform-builder'], { state: { transform } })
  // }

  confirmBack(): void {
    if (this.transformBuilder?.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(GenericDialogComponent, {
        width: '400px',
        data: {
          title: 'Unsaved Changes',
          message:'You have unsaved changes. Do you want to save them before leaving?',
          confirmText: 'Save',
          cancelText: 'Discard',
          neutralText: 'Cancel',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === 'confirm') {
          void this.transformBuilder?.saveToCloud?.();
          this.editing = false;
        } else if (result === 'discard') {
          this.transformBuilder?.discardLocalChanges();
          this.editing = false; 
        }
      });
    } else {
      this.editing = false;
    }
  }

  onEdit(transform?: TransformReadV2025): void {
    if (transform?.type === 'usernameGenerator') {
      this.dialog.open(GenericDialogComponent, {
        data: {
          title: 'Not Supported',
          message:
            'The usernameGenerator transform type cannot be edited using the transform builder.',
        },
      });
      return;
    }

    this.transform = transform;
    this.editing = true;
  }

  onDelete(transform: TransformReadV2025): void {
    this.dialog
      .open(GenericDialogComponent, {
        data: {
          title: 'Delete Transform',
          message: `Are you sure you want to delete the transform "${transform.name}"? This action cannot be undone.`,
          showCancel: true,
          cancelText: 'Cancel',
          confirmText: 'Yes',
          isConfirmation: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          console.log('Deleting transform:', transform);

          const transformDeleteRequest: TransformsV2025ApiDeleteTransformRequest = {
            id: transform.id,
          };
          void this.sdk.deleteTransform(transformDeleteRequest).then(() => {
            this.transforms =
              this.transforms.filter(
                (transformFilter) =>
                  transformFilter.internal !== true &&
                  transformFilter.id !== transform.id
              ) ?? [];
            this.dataSource = new MatTableDataSource(this.transforms);
            this.hasDataLoaded = true;
            this.snackBar.open(
              `${transform.name} transform successfully deleted`,
              'Close',
              { duration: 3000 }
            );
          }).catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);
            this.openMessageDialog(
              `Error deleting transform: ${message}`,
              'Error'
            );
          }).finally(() => {
            this.loading = false;
          });
        }
      });
  }
}