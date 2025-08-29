import { motion } from 'framer-motion';
import { PulseDotLoader } from './prompt-kit/loader';

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <PulseDotLoader className="bg-muted-foreground size-3 animate-[pulse-dot_2s_ease-in-out_infinite] m-1.5" />
    </motion.div>
  );
};
