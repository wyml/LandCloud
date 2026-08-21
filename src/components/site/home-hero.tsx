"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

import type { PublicImage, SiteSettings } from "@/lib/types";

export function HomeHero({
  settings,
  image,
}: {
  settings: SiteSettings;
  image: PublicImage | null;
}) {
  return (
    <section className="relative -mt-14 h-[100svh] min-h-[560px] overflow-hidden">
      {image ? (
        <Image
          src={image.id}
          alt=""
          fill
          sizes="100vw"
          quality={80}
          className="scale-125 object-cover blur-[2px]"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900" />
      )}
      <div className="hero-overlay absolute inset-0" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="glass rounded-3xl px-10 py-8">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl"
          >
            {settings.name}
          </motion.h1>
          {settings.description && (
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 max-w-xl text-lg text-white/80 drop-shadow-sm md:text-xl"
            >
              {settings.description}
            </motion.p>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-6 left-0 right-0 z-10 flex justify-center"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/80 backdrop-blur-md"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
