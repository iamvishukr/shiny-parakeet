declare module "react-csv" {
  import * as React from "react";

  export interface CSVLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    data: object[] | string;
    headers?: { label: string; key: string }[];
    filename?: string;
    separator?: string;
    enclosingCharacter?: string;
    uFEFF?: boolean;
    target?: string;
  }

  export const CSVLink: React.FC<CSVLinkProps>;
  export const CSVDownload: React.FC<CSVLinkProps>;
}
