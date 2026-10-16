/**
 * Tag vocabulary, v1.
 *
 * Tags carry the detail that a three-level verdict cannot: why it was bad,
 * what was good about it. They live in code rather than in the kho because
 * they are vocabulary, not data: events store plain strings, so adding or
 * dropping a tag in a later version never invalidates an old event.
 */

import type { EntityKind } from './events';

export interface TagVocabulary {
  good: string[];
  bad: string[];
}

const VOCABULARY: Record<EntityKind, TagVocabulary> = {
  driver: {
    good: ['chạy êm', 'đúng đường', 'xe sạch', 'đúng giờ', 'thân thiện'],
    bad: [
      'chạy ẩu',
      'vượt đèn đỏ',
      'đi lòng vòng',
      'bắt chờ lâu',
      'đòi thêm tiền',
      'hay hủy cuốc',
      'xe cũ bẩn',
      'mùi thuốc lá',
      'nói nhiều',
    ],
  },
  restaurant: {
    good: ['ngon', 'sạch sẽ', 'nhanh', 'đúng mô tả', 'giá hợp', 'phục vụ dễ thương'],
    bad: ['mặn', 'nhạt', 'nguội', 'ít topping', 'sai món', 'ship lâu', 'đắt', 'quán bẩn', 'dầu lại'],
  },
  dish: {
    good: ['gọi lại', 'đáng tiền', 'ăn hoài không ngán'],
    bad: ['không gọi nữa', 'nhỏ hơn ảnh', 'ngọt quá', 'mặn quá'],
  },
  place: {
    good: ['đáng đi lại', 'chỗ ngồi thoải mái', 'dễ đỗ xe', 'wifi tốt', 'yên tĩnh'],
    bad: ['ồn', 'khó đỗ xe', 'chật', 'nóng'],
  },
};

export function tagsFor(kind: EntityKind): TagVocabulary {
  return VOCABULARY[kind];
}
