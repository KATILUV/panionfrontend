import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Eye, 
  ExternalLink,
  Linkedin,
  Mail,
  Phone,
  User
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Business data interface with LinkedIn and owner info
export interface BusinessOwnerInfo {
  name?: string;
  title?: string;
  confidence?: number;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  social_profiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  tier?: 'premium' | 'enhanced' | 'basic';
  source?: string;
}

export interface BusinessData {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: string | number;
  categories?: string[];
  owner_info?: BusinessOwnerInfo;
  linkedin_company_url?: string;
  manager_info?: BusinessOwnerInfo[];
}

interface BusinessResultsSheetProps {
  results: BusinessData[];
  location: string;
  businessType: string;
  onExport?: () => void;
}

export const BusinessResultsSheet: React.FC<BusinessResultsSheetProps> = ({
  results,
  location,
  businessType,
  onExport
}) => {
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);

  // Export to CSV
  const exportToCSV = () => {
    // Create CSV content
    const headers = [
      'Business Name', 
      'Address', 
      'Phone', 
      'Website', 
      'Rating',
      'Owner Name',
      'Owner Title',
      'Owner Phone',
      'Owner Email',
      'Owner LinkedIn',
      'Company LinkedIn'
    ].join(',');
    
    const rows = results.map(business => {
      return [
        `"${business.name || ''}"`,
        `"${business.address || ''}"`,
        `"${business.phone || ''}"`,
        `"${business.website || ''}"`,
        `"${business.rating || ''}"`,
        `"${business.owner_info?.name || ''}"`,
        `"${business.owner_info?.title || ''}"`,
        `"${business.owner_info?.phone || ''}"`,
        `"${business.owner_info?.email || ''}"`,
        `"${business.owner_info?.linkedin_url || ''}"`,
        `"${business.linkedin_company_url || ''}"`
      ].join(',');
    }).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${businessType}_in_${location}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onExport) {
      onExport();
    }
  };

  // Format LinkedIn URL for display
  const formatLinkedInUrl = (url?: string) => {
    if (!url) return 'N/A';
    return url.replace(/https?:\/\/(www\.)?linkedin\.com\//i, '');
  };

  // Calculate confidence level badge type
  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    if (confidence >= 0.8) {
      return <Badge variant="success">High Confidence</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary">Medium Confidence</Badge>;
    } else {
      return <Badge variant="outline">Low Confidence</Badge>;
    }
  };

  return (
    <Card className="w-full shadow-md border-slate-200">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-primary">Business Owner Results</CardTitle>
          <Badge variant="outline" className="text-sm bg-primary/10 border-primary/30 text-primary">
            {results.length} businesses found
          </Badge>
        </div>
        <CardDescription>
          {businessType.charAt(0).toUpperCase() + businessType.slice(1)} in {location}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-primary/5 dark:bg-primary/10">
              <TableRow>
                <TableHead className="w-[250px] font-semibold">Business</TableHead>
                <TableHead className="font-semibold">Contact Info</TableHead>
                <TableHead className="font-semibold">Person in Charge</TableHead>
                <TableHead className="font-semibold">LinkedIn</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((business, index) => (
                <TableRow key={index} className={index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-slate-900/50"}>
                  <TableCell className="font-medium">
                    <div className="font-semibold">{business.name}</div>
                    <div className="text-xs text-muted-foreground">{business.address}</div>
                    {business.categories && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {business.categories.join(', ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {business.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {business.phone}
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center gap-1 text-sm">
                          <ExternalLink className="h-3 w-3" /> 
                          <a 
                            href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {business.website.replace(/^https?:\/\//i, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {business.owner_info?.name ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> 
                          <span className="font-medium">{business.owner_info.name}</span>
                        </div>
                        {business.owner_info.title && (
                          <div className="text-xs text-muted-foreground">
                            {business.owner_info.title}
                          </div>
                        )}
                        {business.owner_info.phone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" /> {business.owner_info.phone}
                          </div>
                        )}
                        {business.owner_info.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" /> {business.owner_info.email}
                          </div>
                        )}
                        {business.owner_info.tier && (
                          <Badge 
                            variant={
                              business.owner_info.tier === 'premium' ? 'default' : 
                              business.owner_info.tier === 'enhanced' ? 'secondary' : 'outline'
                            }
                            className="text-xs mt-1"
                          >
                            {business.owner_info.tier}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No owner info available</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {business.owner_info?.linkedin_url && (
                        <div className="flex items-center gap-1 text-sm">
                          <Linkedin className="h-3 w-3 text-blue-700" /> 
                          <a 
                            href={business.owner_info.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {formatLinkedInUrl(business.owner_info.linkedin_url)}
                          </a>
                          {getConfidenceBadge(business.owner_info.confidence)}
                        </div>
                      )}
                      {business.linkedin_company_url && (
                        <div className="flex items-center gap-1 text-sm">
                          <Linkedin className="h-3 w-3 text-blue-700" /> 
                          <a 
                            href={business.linkedin_company_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Company Page
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedBusiness(business)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>{business.name}</DialogTitle>
                          <DialogDescription>
                            {business.address}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-medium">Phone:</span>
                            <span className="col-span-3">{business.phone || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-medium">Website:</span>
                            <span className="col-span-3">
                              {business.website ? (
                                <a 
                                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {business.website}
                                </a>
                              ) : 'N/A'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-medium">Rating:</span>
                            <span className="col-span-3">{business.rating || 'N/A'}</span>
                          </div>
                          
                          <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Owner Information</h3>
                            {business.owner_info ? (
                              <div className="grid gap-2">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Name:</span>
                                  <span className="col-span-3">{business.owner_info.name || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Title:</span>
                                  <span className="col-span-3">{business.owner_info.title || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Phone:</span>
                                  <span className="col-span-3">{business.owner_info.phone || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Email:</span>
                                  <span className="col-span-3">{business.owner_info.email || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">LinkedIn:</span>
                                  <span className="col-span-3">
                                    {business.owner_info.linkedin_url ? (
                                      <a 
                                        href={business.owner_info.linkedin_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Linkedin className="h-3 w-3 text-blue-700" />
                                        {formatLinkedInUrl(business.owner_info.linkedin_url)}
                                      </a>
                                    ) : 'N/A'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Company LinkedIn:</span>
                                  <span className="col-span-3">
                                    {business.linkedin_company_url ? (
                                      <a 
                                        href={business.linkedin_company_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Linkedin className="h-3 w-3 text-blue-700" />
                                        Company Page
                                      </a>
                                    ) : 'N/A'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="text-sm font-medium">Data Quality:</span>
                                  <span className="col-span-3">
                                    {business.owner_info.tier ? (
                                      <Badge 
                                        variant={
                                          business.owner_info.tier === 'premium' ? 'default' : 
                                          business.owner_info.tier === 'enhanced' ? 'secondary' : 'outline'
                                        }
                                      >
                                        {business.owner_info.tier}
                                      </Badge>
                                    ) : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No owner information available</p>
                            )}
                          </div>
                          
                          {business.manager_info && business.manager_info.length > 0 && (
                            <div className="border-t pt-4">
                              <h3 className="font-semibold mb-2">Manager Information</h3>
                              {business.manager_info.map((manager, idx) => (
                                <div key={idx} className="grid gap-2 mb-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <span className="text-sm font-medium">Name:</span>
                                    <span className="col-span-3">{manager.name || 'N/A'}</span>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <span className="text-sm font-medium">Title:</span>
                                    <span className="col-span-3">{manager.title || 'N/A'}</span>
                                  </div>
                                  {manager.linkedin_url && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="text-sm font-medium">LinkedIn:</span>
                                      <span className="col-span-3">
                                        <a 
                                          href={manager.linkedin_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <Linkedin className="h-3 w-3 text-blue-700" />
                                          {formatLinkedInUrl(manager.linkedin_url)}
                                        </a>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 border-t">
        <div>
          <span className="text-sm text-muted-foreground">
            Showing {results.length} {businessType.toLowerCase()} with detailed contact information
          </span>
          <div className="text-xs text-muted-foreground mt-1">
            Data quality may vary by business
          </div>
        </div>
        <Button 
          onClick={exportToCSV} 
          variant="outline" 
          className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BusinessResultsSheet;