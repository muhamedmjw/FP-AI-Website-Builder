export type DeploymentRow = {
  websiteId: string;
  chatId: string | null;
  websiteName: string;
  deployUrl: string | null;
  status: string;
  deployCount: number;
  firstDeployedAt: string;
  lastDeployedAt: string;
  updatedAt: string;
  netlifySiteId: string | null;
};

export type ArchivedChatRow = {
  id: string;
  title: string;
  updated_at: string;
  archived_at: string | null;
};
