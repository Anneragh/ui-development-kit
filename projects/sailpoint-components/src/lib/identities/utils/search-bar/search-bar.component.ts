// Angular core and module imports
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Search bar component definition
@Component({
  selector: 'app-search-bar', // Component selector for use in templates
  standalone: true,           // Allows this component to be used without needing to be declared in a module
  imports: [CommonModule, FormsModule], // Modules this component depends on
  templateUrl: './search-bar.component.html', // HTML template file
  styleUrl: './search-bar.component.scss',    // SCSS style file
})
export class SearchBarComponent {
  // Input: full dataset to locally filter against
  @Input() data: any[] = [];

  // Input: placeholder text for the search input
  @Input() placeholder = 'Search...';

  // Output: emits filtered results if local filtering is performed
  @Output() filtered = new EventEmitter<any[]>();

  // Output: emits a search string if API-based search is triggered
  @Output() searchApi = new EventEmitter<string>();

  // Two-way bound model for the input field
  searchQuery = '';

  // Handler called when user types in the search box
  onSearch(query: string): void {
    this.searchQuery = query;
    const lowerQuery = query.trim().toLowerCase();

    // If the search box is cleared, emit the full dataset
    if (!lowerQuery) {
      this.filtered.emit(this.data);
      return;
    }

    // If query is at least 3 characters, trigger remote API search
    if (lowerQuery.length >= 3) {
      this.searchApi.emit(lowerQuery);
      return;
    }

    // Fallback: perform basic local filtering on all item values
    const result = this.data.filter((item) =>
      Object.values(item).some((val) =>
        val?.toString().toLowerCase().includes(lowerQuery)
      )
    );

    this.filtered.emit(result);
  }
}
