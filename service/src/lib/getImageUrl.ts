export type EntityImage =
  | { type: 'file'; fileId: string; fileLinkId: string; url: string }
  | { type: 'enterprise_file'; fileId: string }
  | { type: 'url'; url: string }
  | { type: 'default' };

export type GetImageFieldsParams = {
  id: string;
  name?: string | null;
  email?: string | null;
  image: EntityImage | null;
};

export let getImageFields = async (entity: GetImageFieldsParams) => {
  if (entity.image?.type == 'file') {
    return {
      imageUrl: entity.image.url
    };
  }

  if (entity.image?.type == 'url') {
    return {
      imageUrl: entity.image.url
    };
  }

  let url = new URL(`https://avatar-cdn.metorial.com/aimg_${entity.id.split('_').pop()}`);
  // if (entity.email) url.searchParams.set('email', md5(entity.email));

  return {
    imageUrl: url.toString()
  };
};

export let getImageUrl = async (entity: {
  id: string;
  name?: string | null;
  email?: string | null;
  image: EntityImage | null;
}) => (await getImageFields(entity)).imageUrl;
