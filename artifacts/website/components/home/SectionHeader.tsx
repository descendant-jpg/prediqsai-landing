import Reveal from "./Reveal";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeaderProps) {
  return (
    <Reveal>
      <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">
          // {eyebrow}
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-ice sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-7 text-muted sm:text-lg">{description}</p>
        ) : null}
      </div>
    </Reveal>
  );
}