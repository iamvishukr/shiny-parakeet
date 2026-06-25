export interface Shoot {
  shootId: string;
  name: string;
  traditionalPhotographer: string;
  traditionalVideographer: string;
  candid: string;
  cinemetographer: string;
  assistant: string;
  drone: string;
  other: string;
  createdAt?: Date;
}

export const shootInitialState = {
  name: "",
  traditionalPhotographer: "0",
  traditionalVideographer: "0",
  candid: "0",
  cinemetographer: "0",
  assistant: "0",
  drone: "0",
  other: "0",
  
};
