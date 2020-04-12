export interface Command {
  regex: RegExp;
  signature: string;
  description: string;
  exec: (commandString: string) => Promise<void>;
}
