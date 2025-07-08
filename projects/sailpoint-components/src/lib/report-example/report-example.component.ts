import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { IdentityV2025 } from 'sailpoint-api-client';
import { SailPointSDKService } from '../sailpoint-sdk.service';
import * as d3 from 'd3';
// We don't need to import PieArcDatum as we're using any type cast

// Define interface for chart data
interface ChartDataPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-report-example',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './report-example.component.html',
  styleUrl: './report-example.component.scss'
})
export class ReportExampleComponent implements OnInit {
  title = 'Identity Analytics';
  
  // Data properties
  identities: IdentityV2025[] = [];
  loading = false;
  hasError = false;
  errorMessage = '';
  
  // Chart configuration
  @ViewChild('barChart') private barChartContainer!: ElementRef;
  @ViewChild('pieChart') private pieChartContainer!: ElementRef;
  @ViewChild('lifecycleChart') private lifecycleChartContainer!: ElementRef;
  
  // Chart dimensions
  private width = 700;
  private height = 400;
  private margin = { top: 20, right: 30, bottom: 60, left: 40 };
  
  constructor(private sdk: SailPointSDKService) {}
  
  ngOnInit() {
    void this.loadIdentities();
  }
  
  async loadIdentities() {
    this.loading = true;
    this.hasError = false;
    
    try {
      const response = await this.sdk.listIdentities({ limit: 250 });
      this.identities = response.data || [];
      this.renderCharts();
    } catch (error) {
      this.hasError = true;
      this.errorMessage = `Error loading identities: ${String(error)}`;
    } finally {
      this.loading = false;
    }
  }
  
  renderCharts() {
    setTimeout(() => {
      if (this.identities.length > 0) {
        this.renderIdentityStatusChart();
        this.renderManagerDistributionChart();
        this.renderLifecycleStateChart();
      }
    }, 100);
  }
  
  renderIdentityStatusChart() {
    if (!this.barChartContainer) return;
    
    const element = this.barChartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();
    
    // Count identities by status
    const statusCounts: {[key: string]: number} = {};
    this.identities.forEach(identity => {
      const status = identity.identityStatus || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const data = Object.entries(statusCounts).map(([key, value]) => ({ status: key, count: value }));
    
    const svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    
    const x = d3.scaleBand()
      .domain(data.map(d => d.status))
      .range([0, this.width - this.margin.left - this.margin.right])
      .padding(0.2);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .nice()
      .range([this.height - this.margin.top - this.margin.bottom, 0]);
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${this.height - this.margin.top - this.margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');
    
    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y));
    
    // Color scale
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.status))
      .range(d3.schemeCategory10);
    
    // Add bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.status) || 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => this.height - this.margin.top - this.margin.bottom - y(d.count))
      .attr('fill', d => color(d.status) as string)
      .attr('rx', 4)
      .attr('ry', 4);
      
    // Add title
    svg.append('text')
      .attr('x', (this.width - this.margin.left - this.margin.right) / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Identities by Status');
      
    // Add labels
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.status) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .text(d => d.count);
  }
  
  renderManagerDistributionChart() {
    if (!this.pieChartContainer) return;
    
    const element = this.pieChartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();
    
    // Count identities with/without managers
    const withManager = this.identities.filter(i => i.managerRef && i.managerRef.id).length;
    const withoutManager = this.identities.length - withManager;
    
    const data = [
      { label: 'With Manager', value: withManager },
      { label: 'Without Manager', value: withoutManager }
    ];
    
    const radius = Math.min(this.width, this.height) / 2 - 50;
    
    const svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.width / 2},${this.height / 2})`);
    
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['#4CAF50', '#F44336']);
    
    const pie = d3.pie<ChartDataPoint>()
      .value(d => d.value);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const outerArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);
    
    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', d => {
        // Cast to any to bypass type checking for D3's complex types
        // Using 'as any' is required here since D3's type system doesn't properly align
        // We've tried other approaches, but ESLint is still unhappy with any solution
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return arc(d as any) || '';
      })
      .attr('fill', d => color(d.data.label) as string);
    
    // Add title
    svg.append('text')
      .attr('x', 0)
      .attr('y', -radius - 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Manager Distribution');
    
    // Add labels with lines
    arcs.append('text')
      .attr('transform', d => {
        // Cast to any to bypass type checking for D3's complex types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const pos = outerArc.centroid(d as any) || [0, 0];
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.99 * (midAngle < Math.PI ? 1 : -1);
        return `translate(${pos[0]},${pos[1]})`;
      })
      .attr('dy', '.35em')
      .attr('text-anchor', d => {
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midAngle < Math.PI ? 'start' : 'end';
      })
      .text(d => `${d.data.label}: ${d.data.value} (${Math.round(d.data.value / this.identities.length * 100)}%)`);
    
    // Add polylines
    arcs.append('polyline')
      .attr('points', d => {
        // Cast to any to bypass type checking for D3's complex types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const pos = outerArc.centroid(d as any) || [0, 0];
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.95 * (midAngle < Math.PI ? 1 : -1);
        // Cast to any to bypass type checking for D3's complex types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const arcCentroid = arc.centroid(d as any) || [0, 0];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const outerArcCentroid = outerArc.centroid(d as any) || [0, 0];
        return `${arcCentroid[0]},${arcCentroid[1]},${outerArcCentroid[0]},${outerArcCentroid[1]},${pos[0]},${pos[1]}`;
      })
      .style('fill', 'none')
      .style('stroke', 'gray')
      .style('stroke-width', 1);
  }
  
  renderLifecycleStateChart() {
    if (!this.lifecycleChartContainer) return;
    
    const element = this.lifecycleChartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();
    
    // Count identities by lifecycle state
    const lifecycleCounts: {[key: string]: number} = {};
    
    this.identities.forEach(identity => {
      let state = 'Unknown';

      
      
      if (identity.lifecycleState && identity.lifecycleState.stateName) {
        state = identity.lifecycleState.stateName;
      } else if (identity.attributes && 'cloudLifecycleState' in identity.attributes) {
        state = identity.attributes.cloudLifecycleState as string;
      }
      
      lifecycleCounts[state] = (lifecycleCounts[state] || 0) + 1;
    });
    
    const data = Object.entries(lifecycleCounts)
      .map(([key, value]) => ({ state: key, count: value }))
      .sort((a, b) => b.count - a.count);
    
    const svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    
    const x = d3.scaleBand()
      .domain(data.map(d => d.state))
      .range([0, this.width - this.margin.left - this.margin.right])
      .padding(0.2);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .nice()
      .range([this.height - this.margin.top - this.margin.bottom, 0]);
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${this.height - this.margin.top - this.margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');
    
    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y));
    
    // Color scale
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.state))
      .range(d3.schemeSet2);
    
    // Add horizontal lines
    svg.selectAll('.grid-line')
      .data(y.ticks())
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', this.width - this.margin.left - this.margin.right)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 0.5);
    
    // Add bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.state) || 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => this.height - this.margin.top - this.margin.bottom - y(d.count))
      .attr('fill', d => color(d.state) as string)
      .attr('rx', 4)
      .attr('ry', 4);
      
    // Add title
    svg.append('text')
      .attr('x', (this.width - this.margin.left - this.margin.right) / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Identities by Lifecycle State');
      
    // Add labels
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.state) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .text(d => d.count);
  }
  
  refresh() {
    void this.loadIdentities();
  }
}
