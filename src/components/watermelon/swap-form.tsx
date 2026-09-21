"use client";

import { type FC } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { FaGoogle, FaApple } from "react-icons/fa";

/*  TYPES  */

interface SwapFormTexts {
    signInTitle: string;
    signUpTitle: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    signInButton: string;
    signUpButton: string;
    footerSignIn: string;
    footerSignUp: string;
    footerSignInCta: string;
    footerSignUpCta: string;
}

interface SwapFormProps {
    isSignIn: boolean;
    onModeChange: (isSignIn: boolean) => void;
    texts?: Partial<SwapFormTexts>;
}

/*  DEFAULT TEXTS  */

const DEFAULT_TEXTS: SwapFormTexts = {
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    signInSubtitle: "Hey friend, welcome back!",
    signUpSubtitle: "Just one more step to get started!",
    signInButton: "Get Sign In Code",
    signUpButton: "Create Account",
    footerSignIn: "Don't have account?",
    footerSignUp: "Already have account?",
    footerSignInCta: "Create Account",
    footerSignUpCta: "Sign In",
};

/*  COMPONENT  */

export const SwapForm: FC<SwapFormProps> = ({
    isSignIn,
    onModeChange,
    texts = {},
}) => {
    const mergedTexts = { ...DEFAULT_TEXTS, ...texts };

    /* Animations */
    const variants: Variants = {
        initial: {
            opacity: 0,
            y: -30,
            scale: 0.97,
            filter: "blur(4px)",
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
        },
        exit: {
            opacity: 0,
            y: -30,
            scale: 0.97,
            filter: "blur(4px)",
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isSignIn ? "signin" : "signup"}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    ease: "easeIn",
                    duration: 0.3,
                }}
                className="w-xs overflow-hidden rounded-xl border border-border bg-muted/40 sm:w-sm"
            >
                <div className="rounded-xl border-b border-border bg-card p-5 pb-6">
                    <h2 className="mb-1 text-lg font-medium tracking-tight text-foreground">
                        {isSignIn
                            ? mergedTexts.signInTitle
                            : mergedTexts.signUpTitle}
                    </h2>

                    <p className="mb-5 text-sm text-muted-foreground">
                        {isSignIn
                            ? mergedTexts.signInSubtitle
                            : mergedTexts.signUpSubtitle}
                    </p>

                    {/* Social Buttons */}
                    <div className="space-y-2">
                        <button className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted">
                            <FaGoogle className="size-3.5" />
                            Continue with Google
                        </button>

                        <button className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted">
                            <FaApple className="size-4" />
                            Continue with Apple
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="h-px w-full bg-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-xs text-muted-foreground">
                                OR
                            </span>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1.5 block text-sm text-foreground">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="h-9 w-full rounded-lg bg-foreground text-sm font-medium text-background"
                        >
                            {isSignIn
                                ? mergedTexts.signInButton
                                : mergedTexts.signUpButton}
                        </motion.button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/40 py-3 text-center">
                    <p className="text-sm text-muted-foreground">
                        {isSignIn
                            ? mergedTexts.footerSignIn
                            : mergedTexts.footerSignUp}
                        <button
                            onClick={() => onModeChange(!isSignIn)}
                            className="ml-1 font-medium text-foreground"
                        >
                            {isSignIn
                                ? mergedTexts.footerSignInCta
                                : mergedTexts.footerSignUpCta}
                        </button>
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
