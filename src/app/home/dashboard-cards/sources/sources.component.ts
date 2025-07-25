import { Component, OnInit } from '@angular/core';
import { SourceV2025 } from 'sailpoint-api-client';
import { SailPointSDKService } from 'sailpoint-components';
import { MatCardModule } from '@angular/material/card';
import { AxiosResponse } from 'axios';

@Component({
  selector: 'app-sources',
  imports: [MatCardModule],
  templateUrl: './sources.component.html',
  styleUrl: './sources.component.scss'
})
export class SourcesComponent implements OnInit {
  sdk: SailPointSDKService;
  sources: AxiosResponse<Array<SourceV2025>, any> | undefined;

  constructor() {
    this.sdk = new SailPointSDKService();
  }

  ngOnInit() {
    void this.getSources();
  }

  async getSources() {
    const sources = await this.sdk.listSources({
      count: true
    });
    this.sources = sources;
  }
}
