import Link from 'next/link';
import Image from 'next/image';
import { formatMoney } from '@/lib/format';

export default function ProductCard({ product }) {
  const image = product.product_images?.[0];
  const price = product.base_price_cents;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="card group block overflow-hidden transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-slate-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-700">{formatMoney(price)}</p>
      </div>
    </Link>
  );
}
