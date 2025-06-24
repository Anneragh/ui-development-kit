// search-bar.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  @Input() data: any[] = [];
  @Input() placeholder = 'Search...';
  @Output() filtered = new EventEmitter<any[]>();
  @Output() searchApi = new EventEmitter<string>();

  searchQuery = '';

  onSearch(query: string): void {
    this.searchQuery = query;
    const lowerQuery = query.trim().toLowerCase();

    if (!lowerQuery) {
      this.filtered.emit(this.data);
      return;
    }

    // Emit API search if query meets length threshold
    if (lowerQuery.length >= 3) {
      this.searchApi.emit(lowerQuery);
      return;
    }

    // Fallback to local filtering
    const result = this.data.filter((item) =>
      Object.values(item).some((val) =>
        val?.toString().toLowerCase().includes(lowerQuery)
      )
    );

    this.filtered.emit(result);
  }
}
