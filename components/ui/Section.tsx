import { Reveal } from "./Reveal";

interface Props {
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}

export function Section({ kicker, title, lead, actions, children, id }: Props) {
  return (
    <section className="section" id={id}>
      <Reveal>
        <div className="section__head">
          <div>
            {kicker ? <div className="section__kicker">{kicker}</div> : null}
            <h2 className="section__title">{title}</h2>
            {lead ? <p className="section__lead">{lead}</p> : null}
          </div>
          {actions ? <div className="toolbar">{actions}</div> : null}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  style,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {title || actions ? (
        <div className="card__header">
          <div>
            {title ? <h3 className="card__title">{title}</h3> : null}
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
