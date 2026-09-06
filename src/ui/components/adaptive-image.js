export default function AdaptiveImage({ alt = "", className, ...props }) {
  // This primitive centralizes the image contract for product surfaces
  // without forcing Next Image's remote-domain configuration on the template
  // consumer
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} className={className} alt={alt} />;
}
