import { isReply, type Reply, type Request } from './protocol';

export async function request(message: Request): Promise<Reply> {
  const reply: unknown = await chrome.runtime.sendMessage(message);
  if (!isReply(reply)) throw new Error('Chrysalis received an unexpected response. Reload the extension and try again.');
  return reply;
}
