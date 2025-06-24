import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-column-customizer',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './column-customizer.component.html',
  styleUrl: './column-customizer.component.scss',
})
export class ColumnCustomizerComponent {
  @Input() allColumns: string[] = [];
  @Input() displayedColumns: string[] = [];
  @Output() displayedColumnsChange = new EventEmitter<string[]>();

  showSelector = false;
  @ViewChild('panelRef') panelRef!: ElementRef;

  toggleSelector(): void {
    this.showSelector = !this.showSelector;
  }

  dropColumn(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.allColumns, event.previousIndex, event.currentIndex);
    this.syncVisibleColumns();
  }

  toggleColumn(column: string): void {
    const index = this.displayedColumns.indexOf(column);

    if (index > -1) {
      this.displayedColumns.splice(index, 1);
    } else {
      this.displayedColumns.push(column);
    }

    this.syncVisibleColumns();
  }

  isDisplayed(column: string): boolean {
    return this.displayedColumns.includes(column);
  }

  syncVisibleColumns(): void {
    const ordered = this.allColumns.filter(col => this.displayedColumns.includes(col));
    this.displayedColumnsChange.emit([...ordered]);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (
      this.showSelector &&
      this.panelRef &&
      !this.panelRef.nativeElement.contains(target) &&
      !target.closest('.customizeColumnsToggle')
    ) {
      this.showSelector = false;
    }
  }
}
